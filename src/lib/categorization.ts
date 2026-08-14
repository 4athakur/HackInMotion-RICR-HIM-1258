export const RULE_BASED_MAPPING: Record<string, string> = {
  swiggy: 'Food',
  zomato: 'Food',
  dominos: 'Food',
  uber: 'Travel',
  ola: 'Travel',
  netflix: 'Subscription',
  spotify: 'Subscription',
  'amazon prime': 'Subscription',
  amazon: 'Shopping',
  flipkart: 'Shopping',
  airtel: 'Bills',
  jio: 'Bills',
  electricity: 'Utilities',
  dmart: 'Groceries',
  bigbasket: 'Groceries',
  blinkit: 'Groceries',
  zepto: 'Groceries',
  hospital: 'Healthcare',
  pharmacy: 'Healthcare',
  apollo: 'Healthcare',
  bookmyshow: 'Entertainment',
  pvr: 'Entertainment'
};

// A very simple TF-IDF + Naive Bayes style implementation in JS to fulfill the ML fallback requirement
class SimpleClassifier {
  private categoryWords: Record<string, Record<string, number>> = {};
  private categoryCounts: Record<string, number> = {};
  private totalDocs = 0;

  constructor() {
    // Pre-seed with some basic vocabulary to act as a pre-trained model
    this.train('food dinner lunch breakfast restaurant swiggy zomato burger pizza', 'Food');
    this.train('grocery milk bread vegetables fruits dmart bigbasket', 'Groceries');
    this.train('rent house apartment flat accommodation', 'Rent');
    this.train('bill mobile phone internet broadband wifi electricity water', 'Bills');
    this.train('shopping clothes shoes electronics mall amazon myntra', 'Shopping');
    this.train('travel flight train bus cab taxi uber ola hotel', 'Travel');
    this.train('movie theater concert show netflix prime spotify', 'Entertainment');
    this.train('doctor hospital medicine pharmacy clinic', 'Healthcare');
    this.train('school college fee course udemy coursera', 'Education');
    this.train('salary bonus income wages', 'Salary');
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  }

  train(text: string, category: string) {
    const tokens = this.tokenize(text);
    if (!this.categoryWords[category]) this.categoryWords[category] = {};
    if (!this.categoryCounts[category]) this.categoryCounts[category] = 0;
    
    tokens.forEach(t => {
      this.categoryWords[category][t] = (this.categoryWords[category][t] || 0) + 1;
    });
    this.categoryCounts[category]++;
    this.totalDocs++;
  }

  predict(text: string): { category: string, confidence: number } {
    const tokens = this.tokenize(text);
    let bestCategory = 'Other';
    let bestScore = -Infinity;

    const categories = Object.keys(this.categoryCounts);
    
    categories.forEach(cat => {
      // Prior probability
      let score = Math.log(this.categoryCounts[cat] / this.totalDocs);
      
      tokens.forEach(t => {
        // Add-1 smoothing
        const wordCount = this.categoryWords[cat][t] || 0;
        const totalWords = Object.values(this.categoryWords[cat]).reduce((a, b) => a + b, 0);
        const vocabSize = 1000; // estimated
        score += Math.log((wordCount + 1) / (totalWords + vocabSize));
      });

      if (score > bestScore) {
        bestScore = score;
        bestCategory = cat;
      }
    });

    // Normalize confidence roughly
    const confidence = Math.min(1.0, Math.max(0.1, (bestScore + 100) / 100));

    return { category: bestCategory, confidence };
  }
}

const classifier = new SimpleClassifier();

export async function categorizeTransaction(description: string, merchant: string = ''): Promise<string> {
  // Layer 1: Rule-based
  const text = `${merchant} ${description}`.toLowerCase();
  
  for (const [key, category] of Object.entries(RULE_BASED_MAPPING)) {
    if (text.includes(key.toLowerCase())) {
      return category;
    }
  }

  // Layer 2: ML Fallback
  const prediction = classifier.predict(text);
  
  if (prediction.confidence > 0.4) {
    return prediction.category;
  }

  return 'Other';
}