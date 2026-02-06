"""
    The SkillSpan dataset used for training and evaluation was introduced by
    Zhang et al. (2022) at NAACL-HLT.
    (https://aclanthology.org/2022.naacl-main.366).
"""

from datasets import load_dataset, concatenate_datasets

# load skillspan dataset with official splits (train / validation / test)
def load_skillspan_data():
    splitted_data = load_dataset("jjzha/skillspan")
    data = concatenate_datasets([splitted_data['train'], splitted_data['validation'], splitted_data['test']])

    return data
