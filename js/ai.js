// AI Integration for CoupleCrafts
class AIService {
    constructor() {
        this.providers = {
            gemini: {
                name: 'Google AI Studio (Gemini)',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
                requiresKey: true
            },
            huggingface: {
                name: 'Hugging Face (Mistral-7B)',
                endpoint: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
                requiresKey: true
            }
        };
    }

    async generateActivity(provider, apiKey, theme = 'speculative fiction') {
        const prompt = this.createActivityPrompt(theme);
        
        try {
            let response;
            switch (provider) {
                case 'gemini':
                    response = await this.callGemini(apiKey, prompt);
                    break;
                case 'huggingface':
                    response = await this.callHuggingFace(apiKey, prompt);
                    break;
                default:
                    throw new Error('Unknown AI provider');
            }

            return this.parseActivityResponse(response);
        } catch (error) {
            console.error('AI generation failed:', error);
            throw error;
        }
    }

    createActivityPrompt(theme) {
        const themes = [
            'speculative fiction',
            'romantic bonding',
            'creative expression',
            'culinary adventure',
            'storytelling',
            'artistic creation',
            'mindful connection',
            'playful games'
        ];

        const selectedTheme = theme || themes[Math.floor(Math.random() * themes.length)];

        return `Create a unique at-home activity for a couple with the theme "${selectedTheme}". 

Requirements:
- Must be doable at home with common household items
- Should cost between $0-10
- Include step-by-step instructions (3-7 steps)
- List specific supplies needed
- Provide an estimated cost
- Make it engaging and fun for couples
- Should take 30-90 minutes to complete

Format your response as JSON with this exact structure:
{
  "title": "Activity Title",
  "description": "Brief description of the activity",
  "category": "${selectedTheme}",
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "supplies": ["Item 1", "Item 2", "Item 3"],
  "cost": "$X-Y",
  "duration": "X minutes",
  "difficulty": "Easy/Medium/Hard"
}

Make it creative, romantic, and themed around ${selectedTheme}. Ensure all instructions are clear and specific.`;
    }

    async callGemini(apiKey, prompt) {
    const response = await fetch(`${this.providers.gemini.endpoint}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let friendly = `Gemini API error: ${response.status}`;
            if (response.status === 401 || response.status === 403) friendly += ' (unauthorized)';
            if (response.status === 429) friendly += ' (rate limit)';
            throw new Error(`${friendly} - ${errorText}`);
        }

        const data = await response.json();
        
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;
    }

    async callHuggingFace(apiKey, prompt) {
        const response = await fetch(this.providers.huggingface.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 1024,
                    temperature: 0.7,
                    top_p: 0.95,
                    do_sample: true,
                    return_full_text: false
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let friendly = `Hugging Face API error: ${response.status}`;
            if (response.status === 401 || response.status === 403) friendly += ' (unauthorized)';
            if (response.status === 429) friendly += ' (rate limit)';
            throw new Error(`${friendly} - ${errorText}`);
        }

        const data = await response.json();
        
    if (!data || !data[0] || !data[0].generated_text) {
            throw new Error('Invalid response from Hugging Face API');
        }

        return data[0].generated_text;
    }

    parseActivityResponse(response) {
        try {
            // Try to extract JSON from the response
            let jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const jsonStr = jsonMatch[0];
            const activity = JSON.parse(jsonStr);

            // Validate required fields
            const requiredFields = ['title', 'description', 'instructions', 'supplies', 'cost'];
            for (const field of requiredFields) {
                if (!activity[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Ensure arrays are arrays
            if (!Array.isArray(activity.instructions)) {
                activity.instructions = [activity.instructions];
            }
            if (!Array.isArray(activity.supplies)) {
                activity.supplies = [activity.supplies];
            }

            // Add metadata
            activity.source = 'ai';
            activity.dateGenerated = new Date().toISOString();
            activity.isFavorite = false;
            activity.rating = 0;

            return activity;
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            console.log('Raw response:', response);
            
            // Return a fallback activity if parsing fails
            return this.createFallbackActivity();
        }
    }

    createFallbackActivity() {
        const fallbackActivities = [
            {
                title: "Sci-Fi Story Building",
                description: "Create an interactive science fiction story together, taking turns adding plot twists and characters.",
                category: "speculative fiction",
                instructions: [
                    "Set up a cozy space with notebooks and pens",
                    "One person starts with 'In the year 2157...' and writes for 5 minutes",
                    "Pass the story to your partner who continues for 5 minutes",
                    "Keep alternating until you have a complete short story",
                    "Read the final story aloud together"
                ],
                supplies: ["Paper or notebooks", "Pens", "Timer"],
                cost: "$0-2",
                duration: "45 minutes",
                difficulty: "Easy",
                source: "fallback",
                dateGenerated: new Date().toISOString(),
                isFavorite: false,
                rating: 0
            },
            {
                title: "Future Home Design",
                description: "Design your dream home for the year 2050, incorporating futuristic technology and sustainable living.",
                category: "speculative fiction",
                instructions: [
                    "Gather drawing materials and magazines for inspiration",
                    "Discuss what technology might exist in 2050",
                    "Each person sketches their vision of different rooms",
                    "Combine ideas into one collaborative floor plan",
                    "Present your future home to each other"
                ],
                supplies: ["Paper", "Colored pencils or markers", "Magazines", "Scissors", "Glue"],
                cost: "$3-8",
                duration: "60 minutes",
                difficulty: "Medium",
                source: "fallback",
                dateGenerated: new Date().toISOString(),
                isFavorite: false,
                rating: 0
            }
        ];

        return fallbackActivities[Math.floor(Math.random() * fallbackActivities.length)];
    }

    async testConnection(provider, apiKey) {
        try {
            const testPrompt = "Generate a simple JSON object with a 'test' field containing 'success'.";
            
            switch (provider) {
                case 'gemini':
                    await this.callGemini(apiKey, testPrompt);
                    break;
                case 'huggingface':
                    await this.callHuggingFace(apiKey, testPrompt);
                    break;
                default:
                    throw new Error('Unknown provider');
            }
            
            return { success: true, message: 'Connection successful' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    getProviderInfo(provider) {
        return this.providers[provider] || null;
    }

    getAllProviders() {
        return Object.keys(this.providers).map(key => ({
            id: key,
            ...this.providers[key]
        }));
    }
}

// Global AI service instance
window.aiService = new AIService();

