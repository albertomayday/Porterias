const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase config
const SUPABASE_URL = 'https://sxjwoyxwgmmsaqczvjpd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchStrips() {
  try {
    console.log('Fetching strips from Supabase...');
    const { data, error } = await supabase
      .from('comic_strips')
      .select('*')
      .order('publish_date', { ascending: false });

    if (error) {
      console.error('Error fetching strips:', error);
      return;
    }

    console.log(`Found ${data.length} strips in Supabase`);

    // Transform data to match local format
    const transformedStrips = data.map(strip => ({
      id: strip.id,
      title: strip.title,
      image_url: strip.image_url,
      publish_date: strip.publish_date,
      media_type: strip.media_type || 'image',
      ...(strip.video_url && { video_url: strip.video_url }),
      ...(strip.audio_url && { audio_url: strip.audio_url })
    }));

    // Read current local strips
    const localStripsPath = path.join(__dirname, '..', 'public', 'data', 'strips.json');
    const localData = JSON.parse(fs.readFileSync(localStripsPath, 'utf8'));
    const localStrips = localData.strips || [];

    // Merge: Supabase strips first, then local ones not in Supabase
    const supabaseIds = new Set(transformedStrips.map(s => s.id));
    const additionalLocal = localStrips.filter(s => !supabaseIds.has(s.id));

    const allStrips = [...transformedStrips, ...additionalLocal];

    // Sort by publish_date descending
    allStrips.sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date));

    // Update JSON
    const updatedData = { strips: allStrips };
    fs.writeFileSync(localStripsPath, JSON.stringify(updatedData, null, 2));

    console.log(`Updated strips.json with ${allStrips.length} total strips`);
    console.log('✅ Recovery complete!');

  } catch (error) {
    console.error('Error:', error);
  }
}

fetchStrips();