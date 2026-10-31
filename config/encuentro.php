<?php
return [
 'instagram_version'=>env('INSTAGRAM_GRAPH_VERSION','v26.0'),
 'ai_hosts'=>array_filter(explode(',',env('AI_ALLOWED_HOSTS','api.openai.com,api.anthropic.com,api.groq.com,openrouter.ai'))),
 'geocoding_key'=>env('GEOAPIFY_API_KEY'),
 'tile_url'=>env('MAP_TILE_URL','https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
 'tile_attribution'=>env('MAP_ATTRIBUTION','© OpenStreetMap contributors'),
];
