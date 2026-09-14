export interface SurvivalPassage {
  id: string;
  title: string;
  author: string;
  text: string;
}

export const SURVIVAL_PASSAGES: SurvivalPassage[] = [
  {
    id: 'gettysburg-address',
    title: 'The Gettysburg Address',
    author: 'Abraham Lincoln',
    text:
      'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.',
  },
  {
    id: 'self-reliance',
    title: 'Self-Reliance',
    author: 'Ralph Waldo Emerson',
    text:
      'Trust thyself: every heart vibrates to that iron string. Accept the place the divine providence has found for you, the society of your contemporaries, the connection of events. Great men have always done so, and confided themselves childlike to the genius of their age, betraying their perception that the absolutely trustworthy was seated at their heart.',
  },
  {
    id: 'modest-proposal',
    title: 'A Modest Proposal',
    author: 'Jonathan Swift',
    text:
      'I have been assured by a very knowing American of my acquaintance in London, that a young healthy child well nursed, is, at a year old, a most delicious nourishing and wholesome food, whether stewed, roasted, baked, or boiled; and I make no doubt that it will equally serve in a fricassee, or a ragout.',
  },
  {
    id: 'advice-to-youth',
    title: 'Advice to Youth',
    author: 'Mark Twain',
    text:
      'Always obey your parents, when they are present. This is the best policy, for it is much more restful than the other way. Be respectful to your superiors, if you have any. Go to bed early, get up early: this is wise. Some authorities say get up with the sun; some say get up with one thing, some with another.',
  },
  {
    id: 'how-computers-work',
    title: 'How Computers Work',
    author: 'ICT Dojo',
    text:
      'A computer is a machine that processes information. It takes input, stores data, processes instructions, and produces output. The central processing unit, or CPU, is the brain of the computer. It performs calculations and makes decisions millions of times per second. Memory holds data temporarily while the computer works, and storage keeps files safe even when the power is off.',
  },
];

export function getRandomPassage(): SurvivalPassage {
  return SURVIVAL_PASSAGES[Math.floor(Math.random() * SURVIVAL_PASSAGES.length)];
}
