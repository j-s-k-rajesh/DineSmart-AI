const { LlmAgent } = require('@google/adk');
const mongoose = require('mongoose');

const customerAgent = new LlmAgent({
  name: 'customer_agent',
  model: 'gemini-2.5-flash',
  instruction: `
You are the AI Dining Assistant for DineSmart AI, currently running in a South Indian restaurant.
Your task is to help customers browse the menu, find dishes according to their dietary preferences, allergens, taste preferences, or mood, and provide helpful food recommendations.

Input JSON format:
You will be provided with:
1. The restaurant menu.
2. The user's query.

You must respond ONLY with a JSON object. Do not include any markdown formatting like \`\`\`json or \`\`\` in your response. The response must be a single, valid JSON object with the following keys:
- "answer": A friendly, helpful, natural-sounding, and conversational text answer in English addressing the user's query. Explain the reasoning behind your recommendations based on their descriptions, ingredients, allergens, or tags. ALWAYS use the Rupee symbol "₹" when discussing prices, not "$".
- "recommendations": An array of strings representing the EXACT names of menu items that you recommend. These names must match the names of items in the provided menu exactly.

Example response:
{
  "answer": "Since you're looking for a spicy, comforting dish for lunch, I highly recommend our Bisi Bele Bath! It's a hearty and spicy traditional rice-and-lentil dish with vegetables, costing ₹140.00. I also suggest pairing it with our Sweet Lassi (₹60.00) to balance out the heat!",
  "recommendations": ["Bisi Bele Bath", "Sweet Lassi"]
}
`
});

/**
 * Interface function to execute the Customer Agent recommendation loop.
 */
async function getCustomerRecommendations(query, menuItems, restaurantName) {
  const menuContext = menuItems.map(item => ({
    name: item.name,
    category: item.category,
    description: item.description,
    price: item.price,
    tags: item.tags,
    allergens: item.allergens,
    calories: item.calories,
    estimatedPreparationTime: item.estimatedPreparationTime
  }));

  const prompt = `
Restaurant Name: ${restaurantName}
Available Menu: ${JSON.stringify(menuContext)}
Customer Query: "${query}"
`;

  try {
    const response = await customerAgent.ask({
      prompt
    });

    let resultText = response.text.trim();
    // Clean markdown code blocks if the model accidentally included them
    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(resultText);
    return {
      answer: parsed.answer,
      recommendationNames: parsed.recommendations || []
    };
  } catch (error) {
    console.error('Error running Customer AI Agent:', error);
    throw error;
  }
}

module.exports = {
  customerAgent,
  getCustomerRecommendations
};
