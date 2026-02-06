import re, os, pypandoc, pdfplumber

# clean extracted text from docx and pdfs
def clean_cv_text(text):
    # Convert all text to lowercase
    text = text.lower()  

    # Replace multiple consecutive newlines with a single newline
    text = re.sub(r'\n+', '\n', text)  
    
    # Replace multiple spaces, tabs, or newlines with a single space
    text = re.sub(r'\s+', ' ', text)  

    # Remove page number artifacts commonly found in CV footers
    text = re.sub(r'page \d+ of \d+', '', text)  

    # Remove bullet characters and long dashes
    text = re.sub(r'[•●▪■–—]', ' ', text)  

    # Remove leading and trailing whitespace before sending text to the ML model
    return text.strip()  



# transform input from docx to text
def docx_to_text(filepath):
    text = pypandoc.convert_file(filepath, to='plain')
    return text

# transform input from pdf to text
def pdf_to_text(filepath):
    text = ""

    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""

    return text

# exctract text from input (docx/pdf/txt)
def extract_text(filepath):
    type = os.path.splitext(filepath)[1].lower()

    if type=='.docx':
        return clean_cv_text(docx_to_text(filepath))
    
    elif type=='.pdf':
        return clean_cv_text(pdf_to_text(filepath))
    
    elif type=='.txt':
        with open(filepath, "r", encoding="utf-8") as f:
            return clean_cv_text(f.read())
    
    else:
        raise ValueError(f"Unsupported '{type}' file type.")
    
