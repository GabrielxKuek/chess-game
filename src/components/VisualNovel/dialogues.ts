export interface DialogueLine {
  character?: string;
  text: string;
  image?: string;
  imageOpen?: string; // For mouth animation
}

export const Dialogues = {
  kingCapture: [
    {
      character: "Dark Mage",
      text: "Your king has fallen! Prepare yourself for the ultimate challenge.",
      image: "/characters/dark-mage.png"
    },
    {
      character: "Warrior",
      text: "I won't give up! Let's settle this in battle!",
      image: "/characters/warrior.png"
    }
  ],
  
  praying: [
    {
      character: "Gandhi",
      text: "Be the change that you wish to see in the world. Your prayers have summoned me to guide you.",
      image: "/visual/gandhi.jpeg",
      imageOpen: "/visual/gandhi-open.jpg"
    },
    {
      character: "Gandhi",
      text: "An eye for an eye will only make the whole world blind. Choose your battles wisely, my child.",
      image: "/visual/gandhi.jpeg",
      imageOpen: "/visual/gandhi-open.jpg"
    },
    {
      character: "Gandhi",
      text: "In a gentle way, you can shake the world. Are you ready to face your destiny?",
      image: "/visual/gandhi.jpeg",
      imageOpen: "/visual/gandhi-open.jpg"
    }
  ],
  
  victory: [
    {
      character: "Champion",
      text: "You've proven yourself worthy. The kingdom is safe once more.",
      image: "/characters/champion.png"
    }
  ],
  
  gameStart: [
    {
      character: "Narrator",
      text: "Welcome to the realm where chess, cards, and combat collide!",
      image: "/characters/narrator.png"
    }
  ]
} as const;

export type DialogueKey = keyof typeof Dialogues;