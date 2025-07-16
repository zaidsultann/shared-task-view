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

    // Clean and format the address for better geocoding accuracy
    let formattedAddress = address.trim();
    
    // Add Canada if not present and detect Canadian addresses
    if (!formattedAddress.toLowerCase().includes('canada')) {
      if (formattedAddress.includes('ON') || 
          formattedAddress.toLowerCase().includes('ontario') ||
          formattedAddress.toLowerCase().includes('mississauga') ||
          formattedAddress.toLowerCase().includes('toronto') ||
          formattedAddress.toLowerCase().includes('etobicoke')) {
        formattedAddress += ', Ontario, Canada';
      }
    }
    
    console.log('Original address:', address);
    console.log('Formatted address for geocoding:', formattedAddress);

    // Try multiple geocoding strategies
    let geocodeData: any[] = [];
    let lastError = '';
    
    // Strategy 1: Try the full formatted address with Canadian focus
    try {
      console.log('Geocoding strategy 1: Full formatted address -', formattedAddress);
      const fullUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formattedAddress)}&format=json&limit=3&addressdetails=1&countrycodes=ca&viewbox=-95.152819,41.675105,-74.320068,56.859611&bounded=1`;
      
      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'TaskBoard App/1.0'
        }
      });

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          // Find the most specific result (highest importance or most specific display_name)
          geocodeData = [results.find(r => 
            r.display_name.toLowerCase().includes('ontario') ||
            r.display_name.toLowerCase().includes('mississauga') ||
            r.display_name.toLowerCase().includes('toronto')
          ) || results[0]];
          
          console.log('Strategy 1 SUCCESS - Found coordinates:', geocodeData[0].lat, geocodeData[0].lon);
          console.log('Strategy 1 - Display name:', geocodeData[0].display_name);
        }
      }
    } catch (error) {
      lastError = 'Full address search failed';
      console.log('Strategy 1 failed:', error);
    }

    // Strategy 2: If no results, try without unit number
    if (!geocodeData || geocodeData.length === 0) {
      try {
        // Remove unit/suite numbers and try again
        const cleanedAddress = formattedAddress
          .replace(/unit #?\d+/gi, '')
          .replace(/suite #?\d+/gi, '')
          .replace(/apt #?\d+/gi, '')
          .replace(/apartment #?\d+/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
          
        if (cleanedAddress !== formattedAddress) {
          console.log('Geocoding strategy 2: Cleaned address -', cleanedAddress);
          const cleanedUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedAddress)}&format=json&limit=1&addressdetails=1&countrycodes=ca`;
          
          const response = await fetch(cleanedUrl, {
            headers: {
              'User-Agent': 'TaskBoard App/1.0'
            }
          });

          if (response.ok) {
            geocodeData = await response.json();
            if (geocodeData && geocodeData.length > 0) {
              console.log('Strategy 2 SUCCESS - Found coordinates:', geocodeData[0].lat, geocodeData[0].lon);
            }
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
        const parts = formattedAddress.split(',');
        if (parts.length >= 2) {
          const streetPart = parts[0].replace(/\d+\s*/, '').trim(); // Remove street number
          const cityPart = parts[parts.length - 2].trim(); // Get city (second to last part)
          const basicAddress = `${streetPart}, ${cityPart}, Canada`;
          
          console.log('Geocoding strategy 3: Basic address -', basicAddress);
          const basicUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(basicAddress)}&format=json&limit=1&addressdetails=1&countrycodes=ca`;
          
          const response = await fetch(basicUrl, {
            headers: {
              'User-Agent': 'TaskBoard App/1.0'
            }
          });

          if (response.ok) {
            geocodeData = await response.json();
            if (geocodeData && geocodeData.length > 0) {
              console.log('Strategy 3 SUCCESS - Found coordinates:', geocodeData[0].lat, geocodeData[0].lon);
            }
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
    // Keep full precision - don't round coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    console.log('Final geocoded coordinates with full precision:', { latitude, longitude, display_name });
    console.log('Coordinate precision check - lat decimals:', lat.toString().split('.')[1]?.length || 0, 'lon decimals:', lon.toString().split('.')[1]?.length || 0);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update task with coordinates - keep original address, just add coordinates
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        latitude,
        longitude
        // Keep original address, don't overwrite with display_name
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