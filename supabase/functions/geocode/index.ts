import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, taskId } = await req.json();

    if (!address || !taskId) {
      return new Response(
        JSON.stringify({ error: 'Address and taskId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try multiple geocoding strategies
    let geocodeData: any[] = [];
    let lastError = '';
    
    // Strategy 1: Try the full address
    try {
      console.log('Geocoding strategy 1: Full address -', address);
      const fullUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
      
      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'TaskBoard App/1.0'
        }
      });

      if (response.ok) {
        geocodeData = await response.json();
      }
    } catch (error) {
      lastError = 'Full address search failed';
      console.log('Strategy 1 failed:', error);
    }

    // Strategy 2: If no results, try without unit number
    if (!geocodeData || geocodeData.length === 0) {
      try {
        // Remove unit/suite numbers and try again
        const cleanedAddress = address
          .replace(/unit #?\d+/gi, '')
          .replace(/suite #?\d+/gi, '')
          .replace(/apt #?\d+/gi, '')
          .replace(/apartment #?\d+/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
          
        if (cleanedAddress !== address) {
          console.log('Geocoding strategy 2: Cleaned address -', cleanedAddress);
          const cleanedUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedAddress)}&format=json&limit=1&addressdetails=1`;
          
          const response = await fetch(cleanedUrl, {
            headers: {
              'User-Agent': 'TaskBoard App/1.0'
            }
          });

          if (response.ok) {
            geocodeData = await response.json();
          }
        }
      } catch (error) {
        lastError = 'Cleaned address search failed';
        console.log('Strategy 2 failed:', error);
      }
    }

    // Strategy 3: If still no results, try just street name and city
    if (!geocodeData || geocodeData.length === 0) {
      try {
        // Extract just the street and city parts
        const parts = address.split(',');
        if (parts.length >= 2) {
          const streetPart = parts[0].replace(/\d+\s*/, '').trim(); // Remove street number
          const cityPart = parts[parts.length - 2].trim(); // Get city (second to last part)
          const basicAddress = `${streetPart}, ${cityPart}`;
          
          console.log('Geocoding strategy 3: Basic address -', basicAddress);
          const basicUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(basicAddress)}&format=json&limit=1&addressdetails=1`;
          
          const response = await fetch(basicUrl, {
            headers: {
              'User-Agent': 'TaskBoard App/1.0'
            }
          });

          if (response.ok) {
            geocodeData = await response.json();
          }
        }
      } catch (error) {
        lastError = 'Basic address search failed';
        console.log('Strategy 3 failed:', error);
      }
    }
    
    if (!geocodeData || geocodeData.length === 0) {
      console.log('All geocoding strategies failed for address:', address);
      return new Response(
        JSON.stringify({ error: `No location found for this address. Tried multiple search strategies. ${lastError}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lat, lon, display_name } = geocodeData[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    console.log('Geocoded coordinates:', { latitude, longitude, display_name });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update task with coordinates
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        latitude,
        longitude,
        address: display_name // Update with formatted address
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task with coordinates:', updateError);
      throw updateError;
    }

    console.log('Task updated successfully with coordinates');

    return new Response(
      JSON.stringify({
        latitude,
        longitude,
        formattedAddress: display_name,
        task: updatedTask
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in geocode function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});