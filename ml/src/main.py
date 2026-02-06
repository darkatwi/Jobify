from src.models.skillner import load_skillner
from src.services.skills_extraction import extract_skills
from src.utils.input_to_text import extract_text
# from db.db_client import send_to_db

def run_main_pipeline(filepath, userID, userType):
    # Convert file to text for input
    input = extract_text(filepath=filepath)

    # load model
    loaded = load_skillner()
    skillner = loaded['model']
    tokenizer = loaded['tokenizer']

    # Extract skills from input
    extracted_skills = extract_skills(input, model=skillner, tokenizer=tokenizer)

    # check if the user is a JobSeeker or a Company
    if userType == 'company':
        isJobSeeker = False
    else:
        isJobSeeker = True

    # send skills to db
    # send_to_db(extracted_skills, userID, isJobSeeker=isJobSeeker)

    # print skills extracted
    for i, skill in enumerate(extracted_skills):
        print(f"{i}. skill: {skill['word']}, confidence: {skill['score']}")
    

if __name__ == '__main__':
    path = ""
    userID = 0000000
    userType = "admin"
    run_main_pipeline(path, userID, userType)