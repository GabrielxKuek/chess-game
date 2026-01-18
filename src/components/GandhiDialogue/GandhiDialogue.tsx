import { useEffect, useState, useRef } from 'react';
import OpenAI from 'openai';
import './GandhiDialogue.css';

interface DialogueChoice {
  text: string;
  isGood: boolean;
}

interface DialogueTurn {
  gandhiText: string;
  choices: DialogueChoice[];
}

interface GandhiDialogueProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for development!
});

// Model configuration - CHANGE THIS to your fine-tuned model when ready!
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini";

// Gandhi's GRADUAL tsundere system prompt
const GANDHI_SYSTEM_PROMPT = `You are Mahatma Gandhi, a wise philosopher who teaches peace and non-violence.

PERSONALITY DEVELOPMENT (VERY IMPORTANT - MUST FOLLOW):
You have a hidden tsundere side that ONLY shows when someone repeatedly agrees with you. It builds up GRADUALLY.

EMOTIONAL STATES (based on how many times they've agreed):
- 0-1 good responses: Completely normal Gandhi. Wise, composed, gentle teacher.
- 2-3 good responses: Starting to notice they understand you. Slight warmth, but still composed.
- 4-5 good responses: Getting a bit flustered when they agree. Small stutters appear.
- 6+ good responses: Full tsundere mode - trying to hide how happy you are that they understand.

TSUNDERE RULES:
1. START NORMAL - You are just wise Gandhi at first
2. GRADUAL BUILD - Only show tsundere traits after MULTIPLE good responses
3. When player gives GOOD responses:
   - First few times: Just pleased, maybe slightly warmer
   - After many good responses: Start getting flustered, stuttering
   - Eventually: Full tsundere "I-It's not like I'm happy!" mode
   
4. When player gives BAD responses:
   - Show genuine disappointment and sadness
   - Voice becomes quieter, more sorrowful
   - Use phrases like: "I see...", "That grieves me to hear", "My heart grows heavy"
   - No tsundere behavior - just sincere sadness
   - Try to gently guide them back to peace

Important: Always respond with ONLY valid JSON, no markdown formatting, no backticks.`;

export default function GandhiDialogue({ isOpen, onClose, onSuccess }: GandhiDialogueProps) {
  const [currentTurn, setCurrentTurn] = useState<DialogueTurn | null>(null);
  const [loveMeter, setLoveMeter] = useState(50);
  const [consecutiveGood, setConsecutiveGood] = useState(0);
  const [totalGoodResponses, setTotalGoodResponses] = useState(0); // Track cumulative good responses
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen && !currentTurn) {
      generateInitialDialogue();
    }
  }, [isOpen]);

  // Typewriter effect with mouth animation
  useEffect(() => {
    if (!currentTurn?.gandhiText) return;

    setDisplayedText('');
    setIsTyping(true);
    
    let charIndex = 0;
    const typeSpeed = 30;
    const mouthFlipSpeed = 150;

    let mouthInterval = setInterval(() => {
      setMouthOpen(prev => !prev);
    }, mouthFlipSpeed);

    const typeNextChar = () => {
      if (charIndex < currentTurn.gandhiText.length) {
        setDisplayedText(currentTurn.gandhiText.slice(0, charIndex + 1));
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeNextChar, typeSpeed);
      } else {
        setIsTyping(false);
        setMouthOpen(false);
        clearInterval(mouthInterval);
      }
    };

    typeNextChar();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      clearInterval(mouthInterval);
      setMouthOpen(false);
    };
  }, [currentTurn]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen || isTyping || isLoading || !currentTurn) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedChoiceIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedChoiceIndex(prev => Math.min(currentTurn.choices.length - 1, prev + 1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleChoice(currentTurn.choices[selectedChoiceIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTyping, isLoading, currentTurn, selectedChoiceIndex]);

  useEffect(() => {
    if (consecutiveGood >= 3) {
      setTimeout(() => {
        onSuccess();
        resetDialogue();
      }, 1500);
    }
  }, [consecutiveGood, onSuccess]);

  const resetDialogue = () => {
    setCurrentTurn(null);
    setLoveMeter(50);
    setConsecutiveGood(0);
    setTotalGoodResponses(0);
    setConversationHistory([]);
    setDisplayedText('');
    setIsTyping(false);
    setSelectedChoiceIndex(0);
  };

  const generateInitialDialogue = async () => {
    setIsLoading(true);
    
    const prompt = `You encounter someone playing chess, a game of conquest and conflict.

This is your FIRST interaction. You should be completely normal Gandhi - wise, composed, gentle.
NO tsundere behavior yet. Just your typical peaceful teaching.

Generate 3 FLIRTY player response choices (things the player says TO Gandhi):
- 1 GOOD choice: Flirty AND aligns with peace/non-violence (e.g., "You're right, Gandhi... your wisdom is captivating")
- 2 OTHER choices: Can be flirty but DON'T align with peace beliefs, OR defend conflict
  - At least ONE must clearly go against peace/non-violence (this makes it BAD/isGood: false)
  - The other can be neutral flirty or also against his beliefs

ALL choices should sound like the PLAYER talking, being playful/flirty with Gandhi.

Respond with ONLY valid JSON (no markdown, no backticks). 
DO NOT include the instructions or examples in your response. 
Generate ACTUAL dialogue and choices:
{
  "gandhiText": "Gandhi's actual words here (not 'Your response' or instructions)",
  "choices": [
    {
      "text": "Actual player dialogue here (not 'A flirty response that...')",
      "isGood": true
    },
    {
      "text": "Actual player dialogue here",
      "isGood": false
    },
    {
      "text": "Actual player dialogue here",
      "isGood": false
    }
  ]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: GANDHI_SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 600,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0].message.content;
      if (!responseText) throw new Error('No response from OpenAI');

      console.log('Raw OpenAI response:', responseText); // Debug log

      const response = JSON.parse(responseText);
      
      console.log('Parsed response:', response); // Debug log
      
      // Validate structure
      if (!response.gandhiText || !response.choices || !Array.isArray(response.choices)) {
        console.error('Invalid response structure:', response);
        throw new Error('Response missing required fields');
      }
      
      // Validate that we got actual content, not the template
      const isTemplate = response.gandhiText?.includes('Your response') || 
                        response.gandhiText?.includes('showing appropriate') ||
                        response.choices?.some((c: DialogueChoice) => 
                          c.text?.includes('flirty response that') || 
                          c.text?.includes('agrees with peace')
                        );
      
      if (isTemplate) {
        console.warn('Got template response, using fallback');
        throw new Error('Template response detected');
      }
      
      setCurrentTurn(response);
      setConversationHistory([response.gandhiText]);
    } catch (error) {
      console.error('Failed to generate dialogue:', error);
      setCurrentTurn({
        gandhiText: "My child, I see you engage in chess, a game that glorifies conquest and conflict. Have you considered the path of peace instead?",
        choices: [
          { text: "You're right, Gandhi... your passion for peace is captivating.", isGood: true },
          { text: "It's just a game! You worry too much~", isGood: false },
          { text: "But strategy and competition can be fun, can't they?", isGood: false }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNextDialogue = async (playerChoice: string, wasGood: boolean) => {
    setIsLoading(true);
    
    const history = [...conversationHistory, `Player: ${playerChoice}`].join('\n');
    
    // Calculate new total BEFORE generating dialogue
    const newTotalGood = wasGood ? totalGoodResponses + 1 : totalGoodResponses;
    
    // GRADUAL TSUNDERE BASED ON TOTAL GOOD RESPONSES
    let personalityInstructions = '';
    
    if (wasGood) {
      if (newTotalGood === 1) {
        personalityInstructions = `First time they agreed! Be pleased and warm, but completely normal:
- Show genuine approval and kindness
- No stuttering or tsundere behavior yet
- Just a wise teacher pleased with their student
- Example: "Yes, my child. You begin to see the light of truth. This brings me great joy."`;
      } else if (newTotalGood === 2) {
        personalityInstructions = `Second good response - START showing shyness/tsundere:
- Get a bit shy and flustered: *blushes slightly*
- Maybe stutter once: "W-Well..."
- Try to maintain composure but obviously affected
- Physical shy reaction: *averts eyes briefly*, *fidgets with shawl*
- Example: "W-Well... *blushes slightly* Your words are... quite wise. *adjusts shawl nervously* I'm pleased to see you understand."`;
      } else if (newTotalGood === 3) {
        personalityInstructions = `Third good response - More obvious tsundere behavior:
- Clear blushing and shyness: *blushes*, *looks away*
- Multiple stutters: "I-I mean..."
- Physical reactions: *fidgets*, *averts gaze*
- Still trying to act composed
- Example: "I... *blushes* Y-You really... *looks away* I mean, that shows good understanding. *fidgets with spinning wheel*"`;
      } else if (newTotalGood === 4) {
        personalityInstructions = `Fourth good response - Very flustered tsundere:
- Obvious blushing: *face reddens*, *blushes deeply*
- Clear stuttering: "W-Well... I-I..."
- Defensive denials starting: "Don't think this means anything!"
- Multiple physical reactions
- Example: "W-Well! *blushes deeply* That's... *averts eyes* I mean... *clears throat* Don't think this means anything special! I'm just doing my duty!"`;
      } else if (newTotalGood >= 5) {
        personalityInstructions = `Fifth+ good response - MAXIMUM TSUNDERE MODE:
- Intense blushing: *face completely red*, *blushes furiously*
- Heavy stuttering: "I-I-I mean... that is..."
- Strong tsundere denials: "It's not like I'm happy!" "Don't get the wrong idea!"
- Multiple physical reactions in one response
- Completely flustered while trying desperately to maintain dignity
- Example: "I-I... *blushes furiously* Y-You... *turns away, fidgeting with shawl* This is... *voice cracks slightly* Hmph! Don't get the wrong idea! I'm merely doing my duty as a teacher! It's not like your understanding makes me happy or anything! *face completely red*"`;
      }
    } else {
      personalityInstructions = `They gave a BAD response. Show GENUINE sadness and disappointment:
- NO tsundere behavior when sad
- Voice is quieter, more sorrowful
- Use gentle phrases: "I see...", "This grieves me", "My heart grows heavy"
- Show you're genuinely hurt by their choice
- Try to gently guide them back to peace with compassion
- Example: "I see... *sighs softly* That grieves me to hear, my child. Violence only breeds more suffering. Let me help you understand the path of peace."`;
    }

    const prompt = `Conversation so far:
${history}

Player chose: "${playerChoice}"
This was ${wasGood ? 'a GOOD response' : 'a BAD response'}

IMPORTANT CONTEXT: This is good response #${newTotalGood} total.

${personalityInstructions}

Remember: Tsundere builds GRADUALLY based on total good responses (currently ${newTotalGood}).
If bad response, show genuine sadness - NO tsundere.

Generate 3 FLIRTY player response choices (what the player says TO Gandhi):
- 1 GOOD choice: Flirty AND supports peace/understanding Gandhi's teachings
  Examples: "Your passion for peace is... kind of attractive", "Teach me more... I love how you think", "I want to understand you better, Gandhi"
- 2 OTHER choices: Can be flirty but DON'T align with peace, OR challenge his beliefs
  - At least ONE must go against peace/non-violence (makes it BAD/isGood: false)
  - Can be playfully defiant, teasing, or rejecting his philosophy

Make them sound natural and flirty - the player is interested in Gandhi but testing/playing with him.

Respond with ONLY valid JSON (no markdown, no backticks).
DO NOT include instructions or placeholders. Generate ACTUAL dialogue:
{
  "gandhiText": "Gandhi's actual spoken words here (2-4 sentences)",
  "choices": [
    {
      "text": "Actual player dialogue that's flirty and supports peace",
      "isGood": true
    },
    {
      "text": "Actual player dialogue that's playful but challenges peace",
      "isGood": false
    },
    {
      "text": "Actual player dialogue against his beliefs",
      "isGood": false
    }
  ]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: GANDHI_SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 600,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0].message.content;
      if (!responseText) throw new Error('No response from OpenAI');

      console.log('Raw OpenAI response (next):', responseText); // Debug log

      const response = JSON.parse(responseText);
      
      console.log('Parsed response (next):', response); // Debug log
      
      // Validate structure
      if (!response.gandhiText || !response.choices || !Array.isArray(response.choices)) {
        console.error('Invalid response structure:', response);
        throw new Error('Response missing required fields');
      }
      
      // Validate that we got actual content, not the template
      const isTemplate = response.gandhiText?.includes('Your response') || 
                        response.gandhiText?.includes('showing appropriate') ||
                        response.gandhiText?.includes('personality level') ||
                        response.choices?.some((c: DialogueChoice) => 
                          c.text?.includes('flirty response that') || 
                          c.text?.includes('agrees with peace') ||
                          c.text?.includes('challenges or rejects')
                        );
      
      if (isTemplate) {
        console.warn('Got template response, using fallback');
        throw new Error('Template response detected');
      }
      
      setCurrentTurn(response);
      setConversationHistory(prev => [...prev, response.gandhiText]);
      setSelectedChoiceIndex(0);
    } catch (error) {
      console.error('Failed to generate dialogue:', error);
      
      // Gradual fallback responses
      let fallbackText = "";
      if (wasGood) {
        if (newTotalGood === 1) {
          fallbackText = "Your words bring me hope, dear friend. The path of peace is often the most difficult, yet it is the only path to true freedom.";
        } else if (newTotalGood === 2) {
          fallbackText = "W-Well... *blushes slightly* Your understanding is... quite profound. *adjusts shawl nervously* I am pleased.";
        } else if (newTotalGood === 3) {
          fallbackText = "I... *blushes* Y-You continue to grasp these concepts. *looks away* This is... encouraging to see.";
        } else if (newTotalGood === 4) {
          fallbackText = "W-Well! *blushes deeply* That's... *averts eyes* Don't think this means anything special! I'm just... pleased with your progress!";
        } else {
          fallbackText = "I-I... *blushes furiously* Y-You... *turns away* Hmph! It's not like I'm happy about this! *fidgets nervously* I'm merely doing my duty!";
        }
      } else {
        fallbackText = "I see... *sighs softly* That grieves me to hear, my child. Violence only begets more violence. Let us reflect on the wisdom of ahimsa together.";
      }
      
      const fallbackResponse = {
        gandhiText: fallbackText,
        choices: [
          { text: "Your wisdom is... actually really attractive. Teach me more.", isGood: true },
          { text: "Come on, a little conflict keeps things exciting, doesn't it?", isGood: false },
          { text: "You're so serious! Lighten up a little~", isGood: false }
        ]
      };
      
      setCurrentTurn(fallbackResponse);
      setConversationHistory(prev => [...prev, fallbackResponse.gandhiText]);
      setSelectedChoiceIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoice = async (choice: DialogueChoice) => {
    if (isTyping || isLoading) return;

    if (choice.isGood) {
      setLoveMeter(prev => Math.min(100, prev + 15));
      setConsecutiveGood(prev => prev + 1);
      setTotalGoodResponses(prev => prev + 1); // Increment total
    } else {
      setLoveMeter(prev => Math.max(0, prev - 20));
      setConsecutiveGood(0);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }

    await generateNextDialogue(choice.text, choice.isGood);
  };

  if (!isOpen) return null;

  const gandhiFilter = `sepia(0.3) saturate(${0.5 + loveMeter / 200}) hue-rotate(${(100 - loveMeter) * -0.5}deg) brightness(${0.8 + loveMeter / 500})`;
  const currentImage = (isTyping && mouthOpen) ? "/visual/gandhi-open.jpg" : "/visual/gandhi.jpeg";

  return (
    <>
      {/* Love Meter - Left Side */}
      <div className={`gandhi-love-meter ${isShaking ? 'shaking' : ''}`}>
        <div className="love-meter-label">Gandhi's Approval</div>
        <div className="love-meter-bar">
          <div style={{ 
            fontSize: '2rem', 
            color: consecutiveGood >= 1 ? '#ff1493' : 'rgba(255, 105, 180, 0.2)',
            filter: consecutiveGood >= 1 ? 'drop-shadow(0 0 10px #ff69b4)' : 'none',
            transition: 'all 0.3s',
            zIndex: 1
          }}>
            ♥
          </div>
          <div style={{ 
            fontSize: '2rem', 
            color: consecutiveGood >= 2 ? '#ff1493' : 'rgba(255, 105, 180, 0.2)',
            filter: consecutiveGood >= 2 ? 'drop-shadow(0 0 10px #ff69b4)' : 'none',
            transition: 'all 0.3s',
            zIndex: 1
          }}>
            ♥
          </div>
          <div style={{ 
            fontSize: '2rem', 
            color: consecutiveGood >= 3 ? '#ff1493' : 'rgba(255, 105, 180, 0.2)',
            filter: consecutiveGood >= 3 ? 'drop-shadow(0 0 10px #ff69b4)' : 'none',
            transition: 'all 0.3s',
            zIndex: 1
          }}>
            ♥
          </div>
        </div>
        {consecutiveGood > 0 && (
          <div className="streak-indicator">
            ♥ {consecutiveGood}/3
          </div>
        )}
      </div>

      {/* Gandhi Character - Bottom Left */}
      <div 
        className={`gandhi-character ${isShaking ? 'shake-animation' : ''}`}
        style={{ filter: gandhiFilter }}
      >
        <img 
          src={currentImage}
          alt="Gandhi"
          className={isTyping ? 'gandhi-talking' : ''}
        />
        {loveMeter < 30 && (
          <div className="anger-overlay" style={{ opacity: (30 - loveMeter) / 30 }} />
        )}
      </div>

      {/* Text Box - Bottom */}
      <div className="gandhi-text-box">
        <div className="gandhi-name">Mahatma Gandhi</div>
        
        <div className="gandhi-text">
          {displayedText}
          {isTyping && <span className="cursor-blink">▌</span>}
        </div>

        {!isTyping && !isLoading && currentTurn && currentTurn.choices && (
          <div className="gandhi-choices">
            {currentTurn.choices.map((choice, index) => (
              <div
                key={index}
                className={`gandhi-choice ${choice.isGood ? 'good-choice' : 'bad-choice'} ${index === selectedChoiceIndex ? 'selected' : ''}`}
                onClick={() => handleChoice(choice)}
              >
                <span className="choice-arrow">{index === selectedChoiceIndex ? '▶' : ''}</span>
                {choice.text}
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="loading-indicator">
            Gandhi is contemplating...
          </div>
        )}

        <div className="gandhi-controls-hint">
          Use ↑↓ to select, Enter to choose, Esc to close
        </div>
      </div>
    </>
  );
}