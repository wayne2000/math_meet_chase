
import { GoogleGenAI } from "@google/genai";
import { ScenarioType, SimulationConfig, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to format context for the AI
const getContextPrompt = (scenario: ScenarioType, config: SimulationConfig, timeElapsed: number) => {
  let scenarioDesc = "";
  switch (scenario) {
    case ScenarioType.LINEAR_MEET:
      scenarioDesc = "经典相遇问题 (直线，面对面出发)。";
      break;
    case ScenarioType.LINEAR_CHASE:
      scenarioDesc = "追及问题 (直线，同向跑，红追蓝)。";
      break;
    case ScenarioType.ROUND_TRIP:
      scenarioDesc = "多次往返相遇问题 (两端之间来回跑)。";
      break;
    case ScenarioType.CIRCULAR:
      scenarioDesc = "环形跑道问题 (封闭圆圈，可能套圈)。";
      break;
  }

  return `
    [当前模拟状态数据]
    场景类型: ${scenarioDesc}
    跑道总长: ${config.trackLength} 米。
    红队(兔子)速度: ${config.redSpeed} m/s。
    蓝队(乌龟)速度: ${config.blueSpeed} m/s。
    ${scenario === ScenarioType.LINEAR_CHASE ? `初始追击差距: ${config.initialDistance} 米。` : ''}
    当前模拟运行时间: ${timeElapsed.toFixed(1)} 秒。
  `;
};

export const chatWithMathTeacher = async (
  currentMessage: string,
  chatHistory: ChatMessage[],
  scenario: ScenarioType,
  config: SimulationConfig,
  timeElapsed: number
): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  
  const contextData = getContextPrompt(scenario, config, timeElapsed);

  const systemInstruction = `
    你是一位幽默、亲切的小学奥数老师。你的学生是一个10岁的孩子。
    你的任务是利用提供的[当前模拟状态数据]来回答学生的问题。
    
    教学原则:
    1. **结合数据**: 回答时必须引用当前的具体数字（速度、距离、时间）。
    2. **通俗易懂**: 不要用复杂的代数公式，多用算术思维（比如“速度和”、“速度差”）。
    3. **生动有趣**: 使用表情符号 (🐰, 🐢, 🏁, ⏱️) 活跃气氛。
    4. **启发式**: 如果学生问为什么，引导他们看图或思考，而不是直接丢公式。
    5. **简练**: 每次回答控制在 100-150 字左右，不要长篇大论。
  `;

  // Construct a simple prompt flow. 
  // We inject the context strongly in the latest prompt to ensure it uses the LATEST slider values.
  const prompt = `
    ${contextData}
    
    学生之前的问题和你的回答:
    ${chatHistory.slice(-4).map(m => `${m.role === 'user' ? '学生' : '老师'}: ${m.text}`).join('\n')}
    
    学生现在问: "${currentMessage}"
    
    请作为老师回答 (直接输出回答内容):
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return response.text || "老师正在思考怎么解释更简单，请稍等...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "老师的网络有点卡，请再问一次试试！";
  }
};
