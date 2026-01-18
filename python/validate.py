import json

def validate_jsonl(file_path):
    """Validate JSONL file for OpenAI fine-tuning"""
    print(f"Validating {file_path}...")
    
    errors = []
    valid_count = 0
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line)
                
                # Check required structure
                if 'messages' not in data:
                    errors.append(f"Line {line_num}: Missing 'messages' key")
                    continue
                
                messages = data['messages']
                
                # Must have at least 2 messages (user + assistant)
                if len(messages) < 2:
                    errors.append(f"Line {line_num}: Need at least 2 messages")
                    continue
                
                # Check message structure
                for msg in messages:
                    if 'role' not in msg or 'content' not in msg:
                        errors.append(f"Line {line_num}: Invalid message structure")
                        break
                
                valid_count += 1
                
            except json.JSONDecodeError as e:
                errors.append(f"Line {line_num}: JSON error - {e}")
    
    print(f"\n{'='*50}")
    print(f"VALIDATION RESULTS")
    print(f"{'='*50}")
    print(f"✓ Valid examples: {valid_count}")
    print(f"✗ Errors: {len(errors)}")
    
    if errors:
        print(f"\nFirst 10 errors:")
        for error in errors[:10]:
            print(f"  - {error}")
        return False
    else:
        print(f"\n✅ File is valid and ready for upload!")
        return True

if __name__ == "__main__":
    validate_jsonl("combined_gandhi_training.jsonl")