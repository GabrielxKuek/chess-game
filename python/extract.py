#!/usr/bin/env python3
"""
Gandhi Letters Data Preparation for Fine-tuning - FIXED VERSION
Extracts quotes and structures them for model training
"""

import PyPDF2
import json
import re
import os
from typing import List, Dict

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from PDF file"""
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
    return text

def clean_text(text: str) -> str:
    """Clean extracted text"""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove page numbers and headers/footers
    text = re.sub(r'\n\d+\n', '\n', text)
    # Remove common header artifacts
    text = re.sub(r'PUBUSH£D BY.*?LAHORE', '', text)
    text = re.sub(r'Price \d+[ls]+', '', text)
    text = re.sub(r'SJtllVEU B\'Y.*?Ptmt', '', text)
    return text.strip()

def is_junk_quote(quote: str) -> bool:
    """Filter out junk/headers/footers"""
    junk_patterns = [
        r'PUBUSH',
        r'SJtllVEU',
        r'Price \d+',
        r'INTRODUCTION',
        r'Page \d+',
        r'^In these pages',
        r'^During a period',
        r'^\d+\s*$',  # Just numbers
        r'^[A-Z\s]{20,}$',  # All caps headers
        r'KACHBRI ROAD',
        r'PRINTING WORKS',
    ]
    
    for pattern in junk_patterns:
        if re.search(pattern, quote, re.IGNORECASE):
            return True
    
    # Filter out very short or very long
    if len(quote) < 30 or len(quote) > 300:
        return True
    
    # Must contain some letters
    if not re.search(r'[a-zA-Z]{3,}', quote):
        return True
    
    # Filter salutations and closings
    salutations = ['dear sir', 'yours sincerely', 'yours truly', 'dear friend',
                   'my dear', 'yours faithfully', 'with love', 'blessings']
    if any(quote.lower().startswith(sal) for sal in salutations):
        return True
    
    return False

def split_into_letters(text: str) -> List[str]:
    """Split text into individual letters/passages"""
    # Try multiple splitting strategies
    
    # Strategy 1: Split by date patterns
    letters = re.split(r'\n(?=\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text)
    
    # Strategy 2: Split by "Dear" or "My dear"
    if len(letters) < 10:
        letters = re.split(r'\n(?=(?:My )?[Dd]ear [A-Z])', text)
    
    # Strategy 3: Split by letter numbers
    if len(letters) < 10:
        letters = re.split(r'\n(?=Letter \d+|No\. \d+|\d+\.)', text)
    
    # Strategy 4: Just split into chunks
    if len(letters) < 10:
        chunk_size = len(text) // 50  # Aim for ~50 chunks
        letters = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    
    # Filter out very short segments
    letters = [l.strip() for l in letters if len(l.strip()) > 200]
    
    return letters

def extract_quotes(letters: List[str]) -> List[str]:
    """Extract meaningful quotes from letters"""
    quotes = []
    
    for letter in letters:
        # Split into sentences (improved)
        # Handle periods in abbreviations
        sentences = re.split(r'(?<![A-Z])\.(?!\d)\s+|\n+|[!?]+\s+', letter)
        
        for sentence in sentences:
            sentence = sentence.strip()
            
            # Skip if it's junk
            if is_junk_quote(sentence):
                continue
            
            # Keep philosophical/meaningful sentences
            # Look for keywords that indicate Gandhi's wisdom
            wisdom_keywords = [
                'truth', 'love', 'non-violence', 'god', 'soul', 'spirit',
                'duty', 'service', 'sacrifice', 'peace', 'justice',
                'believe', 'faith', 'prayer', 'heart', 'conscience',
                'freedom', 'liberty', 'righteous', 'moral'
            ]
            
            # Prioritize sentences with wisdom keywords
            has_wisdom = any(keyword in sentence.lower() for keyword in wisdom_keywords)
            
            if has_wisdom or (30 < len(sentence) < 250):
                quotes.append(sentence)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_quotes = []
    for quote in quotes:
        normalized = quote.lower().strip()
        if normalized not in seen:
            seen.add(normalized)
            unique_quotes.append(quote)
    
    return unique_quotes

def create_training_data_jsonl(quotes: List[str], output_path: str):
    """Create JSONL training data in OpenAI fine-tuning format"""
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for quote in quotes:
            # Create varied training examples
            prompt_variations = [
                "What do you believe about love and truth?",
                "Share your wisdom with me.",
                "What would you say about this?",
                "Tell me something meaningful.",
                "Guide me with your thoughts.",
                "What is your philosophy?",
                "Speak to me about life and duty.",
            ]
            
            system_prompts = [
                "You are Gandhi speaking in a visual novel love story. Respond with wisdom, compassion, and deep philosophical insight about love, duty, and life.",
                "You are Mahatma Gandhi in a romantic visual novel. Share your thoughts with gentle wisdom.",
                "You are Gandhi, the spiritual leader. Offer guidance with compassion and truth.",
            ]
            
            # Create 2 examples per quote with different prompts
            import random
            for _ in range(2):
                example = {
                    "messages": [
                        {"role": "system", "content": random.choice(system_prompts)},
                        {"role": "user", "content": random.choice(prompt_variations)},
                        {"role": "assistant", "content": quote}
                    ]
                }
                f.write(json.dumps(example, ensure_ascii=False) + '\n')

def create_training_data_csv(quotes: List[str], output_path: str):
    """Create CSV format for simpler fine-tuning approaches"""
    import csv
    
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['prompt', 'completion'])
        
        prompt_templates = [
            "Gandhi, share your wisdom:",
            "What would Gandhi say about this?",
            "Gandhi's thoughts:",
            "Speak to me, Gandhi:",
            "What is your philosophy, Gandhi?",
            "Guide me with your wisdom:",
            "Tell me about truth and love:",
        ]
        
        for i, quote in enumerate(quotes):
            prompt = prompt_templates[i % len(prompt_templates)]
            writer.writerow([prompt, quote])

def analyze_data_quality(quotes: List[str]):
    """Print statistics about the extracted data"""
    print(f"\n{'='*50}")
    print(f"Data Quality Analysis")
    print(f"{'='*50}")
    print(f"Total quotes extracted: {len(quotes)}")
    
    if len(quotes) == 0:
        print("ERROR: No quotes extracted! Check your PDF file.")
        return
    
    print(f"Average quote length: {sum(len(q) for q in quotes) / len(quotes):.0f} characters")
    print(f"Shortest quote: {min(len(q) for q in quotes)} characters")
    print(f"Longest quote: {max(len(q) for q in quotes)} characters")
    
    print(f"\nSample quotes (first 10):")
    print(f"{'-'*50}")
    for i, quote in enumerate(quotes[:10], 1):
        print(f"{i}. {quote[:150]}{'...' if len(quote) > 150 else ''}")
        print()

def main():
    """Main data preparation pipeline"""
    
    # Get the PDF path - UPDATE THIS!
    pdf_path = "gandhi-letters.pdf"  # Put your PDF in the same folder as this script
    
    # Or use full path:
    # pdf_path = r"C:\Users\Gabriel Kuek\Desktop\Side Stuff\chess-game\python\gandhi_letters.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"ERROR: PDF file not found at: {pdf_path}")
        print(f"Current directory: {os.getcwd()}")
        print(f"\nPlease either:")
        print(f"1. Copy your PDF to: {os.getcwd()}")
        print(f"2. Or edit line 200 in this script with the full path to your PDF")
        return
    
    print("Step 1: Extracting text from PDF...")
    raw_text = extract_text_from_pdf(pdf_path)
    print(f"Extracted {len(raw_text)} characters")
    
    print("\nStep 2: Cleaning text...")
    clean = clean_text(raw_text)
    
    print("\nStep 3: Splitting into letters...")
    letters = split_into_letters(clean)
    print(f"Found {len(letters)} letters/sections")
    
    print("\nStep 4: Extracting quotes...")
    quotes = extract_quotes(letters)
    
    # Analyze quality
    analyze_data_quality(quotes)
    
    if len(quotes) < 50:
        print("\n⚠️  WARNING: Found fewer than 50 quotes.")
        print("The PDF might have unusual formatting.")
        print("You may need to manually extract quotes.")
    
    print("\nStep 5: Creating training files...")
    
    # Use current directory instead of /home/claude
    output_dir = "."
    
    # Create JSONL for OpenAI fine-tuning
    create_training_data_jsonl(quotes, f"{output_dir}/gandhi_training.jsonl")
    print("✓ Created: gandhi_training.jsonl (OpenAI format)")
    
    # Create CSV for other approaches
    create_training_data_csv(quotes, f"{output_dir}/gandhi_training.csv")
    print("✓ Created: gandhi_training.csv (CSV format)")
    
    # Save raw quotes for manual review
    with open(f"{output_dir}/gandhi_quotes.txt", 'w', encoding='utf-8') as f:
        for i, quote in enumerate(quotes, 1):
            f.write(f"{i}. {quote}\n\n")
    print("✓ Created: gandhi_quotes.txt (for manual review)")
    
    print(f"\n{'='*50}")
    print("Data preparation complete!")
    print(f"{'='*50}")
    print(f"\nFiles created in: {os.path.abspath(output_dir)}")
    
    if len(quotes) >= 100:
        print("\n✅ Good! You have enough quotes for fine-tuning.")
        print("Next steps:")
        print("1. Review gandhi_quotes.txt and remove any junk")
        print("2. Choose your fine-tuning method (see guide)")
        print("3. Upload the JSONL or CSV file")
    else:
        print("\n⚠️  You may want to manually add more quotes.")
        print("Goal: 200-500 high-quality Gandhi quotes")

if __name__ == "__main__":
    main()