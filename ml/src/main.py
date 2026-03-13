from src.models.skillner import load_skillner
from src.services.skills_extraction import build_skill_pipeline, extract_skills
from src.services.esco import search_skill_esco
from src.utils.input_to_text import extract_text

from fastapi import FastAPI, UploadFile, File
import os
import tempfile
from pydantic import BaseModel
import re

CONF_THRESHOLD = 0.3

# load model
_loaded = load_skillner()
_skillner = _loaded["model"]
_tokenizer = _loaded["tokenizer"]

# Building skill extraction pipeline
pipeline = build_skill_pipeline(model=_skillner, tokenizer=_tokenizer)

def run_main_pipeline(filepath, conf_threshold=CONF_THRESHOLD):
    # Convert file to text for input
    text = extract_text(filepath=filepath)

    # Extract skills from input
    extracted_skills = extract_skills(text, pipeline, _tokenizer)

    print("EXTRACTED_SKILLS_LEN =", len(extracted_skills))
    print("EXTRACTED_SKILLS_SAMPLE =", extracted_skills[:10])

    skills = []

    for skill in extracted_skills:
        current_skill = skill["skill"].strip()
        current_score = float(skill["score"])

        if current_score >= conf_threshold:
            skills.append({
                "skill": current_skill,
                "score": current_score
            })
        else:
            esco_skill = search_skill_esco(current_skill)
            if esco_skill:
                skills.append({
                    "skill": esco_skill["normalized_name"],
                    "score": current_score
                })

    # Normalize and deduplicate, keeping highest score
    dedup = {}

    for item in skills:
        key = item["skill"].lower()
        if key not in dedup or item["score"] > dedup[key]["score"]:
            dedup[key] = item

    return list(dedup.values())


app = FastAPI()

class OpportunityRequest(BaseModel):
    description: str
    requirements: str | None = None


@app.post("/extract/opportunity")
async def extract_opportunity(req: OpportunityRequest):
    text = f"{req.description or ''}\n{req.requirements or ''}".strip().lower()

    found = []

    skill_map = {
        "Machine Learning": [r"\bmachine learning\b", r"\bml\b"],
        "Deep Learning": [r"\bdeep learning\b"],
        "Computer Vision": [r"\bcomputer vision\b"],
        "Natural Language Processing": [r"\bnatural language processing\b", r"\bnlp\b"],
        "Transformers": [r"\btransformers?\b"],
        "Python": [r"\bpython\b"],
        "PyTorch": [r"\bpytorch\b"],
        "Data Analysis": [r"\bdata analysis\b"],
        "Research Writing": [r"\bresearch writing\b", r"\bscientific writing\b"],
    }

    for skill_name, patterns in skill_map.items():
        if any(re.search(pattern, text) for pattern in patterns):
            found.append(skill_name)

    return {"skills": found[:4]}

@app.post("/extract/cv-file")
async def extract_cv_file(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename)[1].lower()

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    skills = run_main_pipeline(tmp_path)

    os.remove(tmp_path)

    return {"skills": skills}
