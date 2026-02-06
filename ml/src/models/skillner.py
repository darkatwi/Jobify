"""
SkillNER (Reference Model)

This module loads the `ihk/skillner` model, which is a JobBERT-based
token classification model fine-tuned on the labeled SkillSpan dataset
for skill extraction using BIO tagging (B-SKILL, I-SKILL, O).

The model is used as a ready-to-use reference system and is NOT trained
or modified in this project. It serves as a benchmark for evaluating
skill extraction performance.

Backbone:
- jjzha/jobbert-base-cased (domain-pretrained on job postings)

Task:
- Token classification (Named Entity Recognition for skills)

Usage:
- Inference only
- Evaluation and comparison against custom-trained models
"""

from transformers import AutoTokenizer, AutoModelForTokenClassification

# load model
def load_skillner():
    tokenizer = AutoTokenizer.from_pretrained("ihk/skillner")
    model = AutoModelForTokenClassification.from_pretrained("ihk/skillner")

    return {'tokenizer': tokenizer, 'model': model}
