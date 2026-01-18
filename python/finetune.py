import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")

def upload_training_file(client, file_path):
    """Upload training file to OpenAI"""
    print(f"Uploading {file_path}...")
    
    try:
        with open(file_path, 'rb') as f:
            response = client.files.create(
                file=f,
                purpose='fine-tune'
            )
        
        file_id = response.id
        print(f"✓ File uploaded successfully!")
        print(f"  File ID: {file_id}")
        
        # Wait for file to be processed
        print(f"\nWaiting for file to be processed...")
        while True:
            file_info = client.files.retrieve(file_id)
            status = file_info.status
            
            print(f"  Status: {status}")
            
            if status == "processed":
                print(f"✓ File processed and ready!")
                break
            elif status == "error":
                print(f"✗ Error processing file!")
                print(f"  Error: {file_info}")
                return None
            
            time.sleep(2)
        
        return file_id
    
    except FileNotFoundError:
        print(f"\nerror: File '{file_path}' not found!")
        print(f"Make sure you've run the scraper first.")
        return None
    except Exception as e:
        print(f"\nerror: {e}")
        return None

def create_fine_tune_job(client, file_id, model="gpt-4o-mini-2024-07-18", suffix="gandhi-vn"):
    """Create a fine-tuning job"""
    print(f"\nCreating fine-tune job...")
    print(f"  Model: {model}")
    print(f"  Suffix: {suffix}")
    
    try:
        response = client.fine_tuning.jobs.create(
            training_file=file_id,
            model=model,
            suffix=suffix,
            hyperparameters={
                "n_epochs": 3
            }
        )
        
        job_id = response.id
        print(f" Fine-tune job created")
        print(f"  Job ID: {job_id}")
        
        return job_id
    
    except Exception as e:
        print(f"\nerror creating fine-tune job: {e}")
        return None

def monitor_fine_tune(client, job_id):
    """Monitor fine-tuning progress"""
    print(f"\nMonitoring fine-tune job: {job_id}")
    print(f"{'='*50}\n")
    
    try:
        while True:
            job = client.fine_tuning.jobs.retrieve(job_id)
            status = job.status
            
            print(f"Status: {status}")
            
            if status == "succeeded":
                print(f"\n{'='*50}")
                print(f"FINE-TUNING COMPLETE")
                print(f"{'='*50}")
                print(f"Model ID: {job.fine_tuned_model}")
                return job.fine_tuned_model
            
            elif status == "failed":
                print(f"\nFine-tuning failed!")
                if hasattr(job, 'error'):
                    print(f"Error: {job.error}")
                return None
            
            elif status == "cancelled":
                print(f"\nFine-tuning was cancelled")
                return None
            
            # Show progress if available
            if hasattr(job, 'trained_tokens') and job.trained_tokens:
                print(f"  Trained tokens: {job.trained_tokens}")
            
            time.sleep(30)
    
    except KeyboardInterrupt:
        print(f"\n\nMonitoring stopped. Job is still running")
        print(f"Check status later with job ID: {job_id}")
        return None
    except Exception as e:
        print(f"\nerror: {e}")
        return None

def main():
    """Main execution"""
    print("="*50)
    print("GANDHI FINE-TUNING PIPELINE")
    print("="*50)
    
    # Check API key
    if API_KEY == "sk-proj-YOUR-KEY-HERE":
        print("\nerror: u need openai api key")
        return
    
    # Initialize client
    client = OpenAI(api_key=API_KEY)
    
    # Step 1: Upload
    file_id = upload_training_file(client, "combined_gandhi_training.jsonl")
    if not file_id:
        print("\nFailed to upload file. Exiting.")
        return
    
    # Step 2: Create fine-tune job
    # CHOOSE YOUR MODEL:
    # - gpt-4o-mini-2024-07-18 (RECOMMENDED: $3/M tokens training, good quality)
    # - gpt-3.5-turbo (CHEAPEST: $8/M tokens training, decent quality)
    
    job_id = create_fine_tune_job(
        client,
        file_id, 
        model="gpt-4o-mini-2024-07-18",
        suffix="gandhi-vn"
    )
    
    if not job_id:
        print("\nFailed to create fine-tune job. Exiting.")
        return
    
    # Step 3: Monitor
    model_id = monitor_fine_tune(client, job_id)
    
    if model_id:
        print(f"\n{'='*50}")
        print(f"NEXT STEPS")
        print(f"{'='*50}")
        print(f"\nYour fine-tuned model is ready!")
        print(f"Model ID: {model_id}")
        print(f"\nUse it in your code:")
        print(f"""
from openai import OpenAI

client = OpenAI(api_key="your-api-key")

response = client.chat.completions.create(
    model="{model_id}",
    messages=[
        {{"role": "system", "content": "You are Gandhi in a visual novel."}},
        {{"role": "user", "content": "Share wisdom about love"}}
    ]
)

print(response.choices[0].message.content)
        """)
        
        # Save model ID for later
        with open("gandhi_model_id.txt", "w") as f:
            f.write(model_id)
        print(f"\n✓ Model ID saved to: gandhi_model_id.txt")

if __name__ == "__main__":
    main()