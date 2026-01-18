#!/usr/bin/env python3
"""
Gandhi Speeches Web Scraper
Scrapes speeches from mkgandhi.org and combines with PDF data
"""

import requests
from bs4 import BeautifulSoup
import json
import csv
import re
import time
import os
from typing import List, Dict

# List of all speech URLs from the main page
SPEECH_URLS = [
    "https://www.mkgandhi.org/speeches/kashmir_issue.php",
    "https://www.mkgandhi.org/speeches/madras.php",
    "https://www.mkgandhi.org/speeches/gto1922.php",
    "https://www.mkgandhi.org/speeches/dandi_march.php",
    "https://www.mkgandhi.org/speeches/rtconf.php",
    "https://www.mkgandhi.org/speeches/bhu.php",
    "https://www.mkgandhi.org/speeches/qui.php",
    "https://www.mkgandhi.org/speeches/interasian.php",
    "https://www.mkgandhi.org/speeches/evelast.php",
]

def scrape_speech(url: str) -> Dict[str, str]:
    """Scrape a single speech page"""
    print(f"Scraping: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the main content table
        # The speech content is usually in a table or specific div
        content_table = soup.find('table')
        
        if content_table:
            # Extract all text from the table
            text = content_table.get_text(separator=' ', strip=True)
        else:
            # Fallback: get all paragraph text
            paragraphs = soup.find_all('p')
            text = ' '.join([p.get_text(strip=True) for p in paragraphs])
        
        # Get the title
        title_tag = soup.find('title')
        title = title_tag.get_text() if title_tag else url.split('/')[-1]
        
        return {
            'url': url,
            'title': title,
            'content': text
        }
    
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None

def extract_quotes_from_speech(speech_data: Dict[str, str]) -> List[str]:
    """Extract meaningful quotes from a speech"""
    if not speech_data:
        return []
    
    content = speech_data['content']
    
    # Split into sentences
    sentences = re.split(r'[.!?]+\s+', content)
    
    quotes = []
    for sentence in sentences:
        sentence = sentence.strip()
        
        # Filter criteria
        if not sentence or len(sentence) < 30 or len(sentence) > 300:
            continue
        
        # Skip navigation and metadata
        skip_patterns = [
            r'Back\s*Next',
            r'Home\s*About Us',
            r'Mahatma Gandhi',
            r'mkgandhi\.org',
            r'Comprehensive website',
            r'Gandhian Institutions',
            r'^\s*\d+\.\s*$',
            r'Menu\s*Submit',
            r'Famous Speeches',
        ]
        
        if any(re.search(pattern, sentence, re.IGNORECASE) for pattern in skip_patterns):
            continue
        
        # Prioritize philosophical content
        wisdom_keywords = [
            'truth', 'love', 'non-violence', 'god', 'freedom', 'duty',
            'service', 'sacrifice', 'peace', 'justice', 'believe', 'faith',
            'soul', 'spirit', 'heart', 'conscience', 'moral', 'righteous',
            'ahimsa', 'satyagraha', 'mankind', 'humanity'
        ]
        
        has_wisdom = any(keyword in sentence.lower() for keyword in wisdom_keywords)
        
        # Must have actual words, not just navigation
        word_count = len(re.findall(r'\b\w+\b', sentence))
        if word_count < 5:
            continue
        
        if has_wisdom or (30 < len(sentence) < 250):
            quotes.append(sentence)
    
    return quotes

def scrape_all_speeches() -> List[str]:
    """Scrape all speeches and extract quotes"""
    all_quotes = []
    
    for url in SPEECH_URLS:
        speech_data = scrape_speech(url)
        if speech_data:
            quotes = extract_quotes_from_speech(speech_data)
            all_quotes.extend(quotes)
            print(f"  → Extracted {len(quotes)} quotes")
        
        # Be polite to the server
        time.sleep(1)
    
    return all_quotes

def remove_duplicates(quotes: List[str]) -> List[str]:
    """Remove duplicate quotes while preserving order"""
    seen = set()
    unique = []
    
    for quote in quotes:
        # Normalize for comparison
        normalized = quote.lower().strip()
        if normalized not in seen and len(normalized) > 0:
            seen.add(normalized)
            unique.append(quote)
    
    return unique

def merge_with_existing_data(new_quotes: List[str], existing_file: str = "gandhi_quotes.txt") -> List[str]:
    """Merge new quotes with existing PDF-extracted quotes"""
    all_quotes = list(new_quotes)
    
    if os.path.exists(existing_file):
        print(f"\nMerging with existing quotes from {existing_file}...")
        with open(existing_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # Extract quotes (they're numbered)
            existing_quotes = re.findall(r'\d+\.\s*(.+?)(?=\n\n|\n\d+\.|\Z)', content, re.DOTALL)
            all_quotes.extend([q.strip() for q in existing_quotes if q.strip()])
        
        print(f"  → Added {len(existing_quotes)} quotes from PDF")
    
    # Remove duplicates
    unique_quotes = remove_duplicates(all_quotes)
    print(f"  → Total unique quotes: {len(unique_quotes)}")
    
    return unique_quotes

def create_training_files(quotes: List[str], prefix: str = "combined"):
    """Create training files in multiple formats"""
    
    print(f"\nCreating training files...")
    
    # 1. Create JSONL for OpenAI
    jsonl_path = f"{prefix}_training.jsonl"
    with open(jsonl_path, 'w', encoding='utf-8') as f:
        system_prompts = [
            "You are Gandhi speaking in a visual novel love story. Respond with wisdom, compassion, and deep philosophical insight about love, duty, and life.",
            "You are Mahatma Gandhi in a romantic visual novel. Share your thoughts with gentle wisdom.",
            "You are Gandhi, the spiritual leader. Offer guidance with compassion and truth.",
        ]
        
        user_prompts = [
            "What do you believe about love and truth?",
            "Share your wisdom with me.",
            "Tell me something meaningful.",
            "Guide me with your thoughts.",
            "What is your philosophy?",
            "Speak to me about life and duty.",
            "How should I live my life?",
        ]
        
        import random
        for quote in quotes:
            # Create 2 training examples per quote with variation
            for _ in range(2):
                example = {
                    "messages": [
                        {"role": "system", "content": random.choice(system_prompts)},
                        {"role": "user", "content": random.choice(user_prompts)},
                        {"role": "assistant", "content": quote}
                    ]
                }
                f.write(json.dumps(example, ensure_ascii=False) + '\n')
    
    print(f"✓ Created: {jsonl_path}")
    
    # 2. Create CSV
    csv_path = f"{prefix}_training.csv"
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['prompt', 'completion'])
        
        prompts = [
            "Gandhi, share your wisdom:",
            "What would Gandhi say?",
            "Tell me about truth and love:",
            "Guide me, Gandhi:",
            "Your philosophy, Mahatma:",
        ]
        
        for i, quote in enumerate(quotes):
            writer.writerow([prompts[i % len(prompts)], quote])
    
    print(f"✓ Created: {csv_path}")
    
    # 3. Create readable text file
    txt_path = f"{prefix}_quotes.txt"
    with open(txt_path, 'w', encoding='utf-8') as f:
        for i, quote in enumerate(quotes, 1):
            f.write(f"{i}. {quote}\n\n")
    
    print(f"✓ Created: {txt_path}")
    
    # 4. Create a prompt template file
    prompt_path = f"{prefix}_system_prompt.txt"
    with open(prompt_path, 'w', encoding='utf-8') as f:
        f.write("""You are Mahatma Gandhi in a romantic visual novel set in the 1920s-1940s.

Your character traits:
- Deeply philosophical and spiritual
- Speaks with gentle wisdom and compassion
- Uses metaphors from nature and simple life
- Emphasizes truth (Satya), non-violence (Ahimsa), and love
- Draws from Hindu philosophy, Bhagavad Gita, and universal truths
- Humble yet firm in convictions
- Sees love as intertwined with duty and service

Speaking style:
- Thoughtful and measured
- Often addresses as "my dear friend" or "dear one"
- References spinning, simplicity, nature
- Asks probing questions to guide reflection
- Balances idealism with practical wisdom

In this visual novel, you engage in deep conversations about:
- The nature of true love vs attachment
- Duty to family, country, and self
- Finding truth in relationships
- Balancing personal desires with higher purpose
- The spiritual dimensions of romance

Sample authentic Gandhi wisdom:
""")
        # Add top 30 quotes as examples
        for i, quote in enumerate(quotes[:30], 1):
            f.write(f"{i}. {quote}\n")
        
        f.write("""\nRespond authentically as Gandhi would, blending wisdom with warmth.""")
    
    print(f"✓ Created: {prompt_path}")
    
    return jsonl_path, csv_path, txt_path, prompt_path

def analyze_data(quotes: List[str]):
    """Analyze and display statistics"""
    print(f"\n{'='*60}")
    print(f"DATA ANALYSIS")
    print(f"{'='*60}")
    print(f"Total unique quotes: {len(quotes)}")
    print(f"Average length: {sum(len(q) for q in quotes) / len(quotes):.0f} characters")
    print(f"Shortest: {min(len(q) for q in quotes)} characters")
    print(f"Longest: {max(len(q) for q in quotes)} characters")
    
    # Count wisdom-related quotes
    wisdom_keywords = ['truth', 'love', 'non-violence', 'freedom', 'duty', 'service']
    wisdom_quotes = [q for q in quotes if any(kw in q.lower() for kw in wisdom_keywords)]
    print(f"Quotes with wisdom keywords: {len(wisdom_quotes)} ({len(wisdom_quotes)/len(quotes)*100:.1f}%)")
    
    print(f"\n{'='*60}")
    print(f"SAMPLE QUOTES (first 10):")
    print(f"{'='*60}")
    for i, quote in enumerate(quotes[:10], 1):
        print(f"\n{i}. {quote[:200]}{'...' if len(quote) > 200 else ''}")

def main():
    """Main execution"""
    print("="*60)
    print("GANDHI SPEECHES WEB SCRAPER")
    print("="*60)
    
    # Step 1: Scrape web speeches
    print("\nStep 1: Scraping speeches from mkgandhi.org...")
    web_quotes = scrape_all_speeches()
    print(f"\n✓ Scraped {len(web_quotes)} quotes from web")
    
    # Step 2: Merge with existing PDF data
    print("\nStep 2: Merging with PDF data...")
    all_quotes = merge_with_existing_data(web_quotes)
    
    # Step 3: Analyze
    analyze_data(all_quotes)
    
    # Step 4: Create training files
    print("\nStep 3: Creating training files...")
    files = create_training_files(all_quotes, prefix="combined_gandhi")
    
    print(f"\n{'='*60}")
    print(f"SUCCESS!")
    print(f"{'='*60}")
    print(f"\nFiles created:")
    for file in files:
        print(f"  - {file}")
    
    print(f"\nTotal training examples: {len(all_quotes) * 2} (2x each quote)")
    
    if len(all_quotes) >= 200:
        print(f"\nExcellent! You have {len(all_quotes)} quotes.")
        print(f"This is enough for high-quality fine-tuning!")
    elif len(all_quotes) >= 100:
        print(f"\n✓ Good! You have {len(all_quotes)} quotes.")
        print(f"This should work for fine-tuning.")
    else:
        print(f"\nYou have {len(all_quotes)} quotes.")
        print(f"Try to get at least 100-200 for best results.")
    
    print(f"\nNext steps:")
    print(f"1. Review combined_gandhi_quotes.txt")
    print(f"2. Remove any junk/duplicates manually")
    print(f"3. Use combined_gandhi_training.jsonl for OpenAI fine-tuning")
    print(f"4. Or use combined_gandhi_system_prompt.txt for prompt engineering")

if __name__ == "__main__":
    main()