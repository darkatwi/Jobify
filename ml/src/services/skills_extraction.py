from transformers import pipeline

# Exctract skills from input (input text -> model -> skills)
def build_skill_pipeline(model, tokenizer):
    ner = pipeline(
        task="token-classification",
        model=model,
        tokenizer = tokenizer,
        aggregation_strategy="simple"   # merges B/I tokens
    )

    return ner

def extract_skills(input, pipeline):
    return pipeline(input)