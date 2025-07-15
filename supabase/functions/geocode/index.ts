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

    // Geocode using OpenStreetMap Nominatim API (free, no API key required)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
    
    console.log('Geocoding address:', address);
    console.log('Nominatim URL:', nominatimUrl);

    const geocodeResponse = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'TaskBoard App/1.0'
      }
    });

    if (!geocodeResponse.ok) {
      throw new Error('Failed to geocode address');
    }

    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData || geocodeData.length === 0) {
      console.log('No geocoding results found for address:', address);
      return new Response(
        JSON.stringify({ error: 'No location found for this address' }),
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