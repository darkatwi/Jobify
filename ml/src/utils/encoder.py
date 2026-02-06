# Tokenize tokens (word-level) and align BIO labels to subword tokens
# Uses -100 for tokens we want to ignore (special tokens + extra subwords)
def tokenize_and_align_labels(tokenizer, tokens, tags):
    # tokenize the data
    tokenized = tokenizer(tokens, truncation=True, is_split_into_words=True, return_attention_mask=True, max_length=256)
    
    word_ids = tokenized.word_ids() # For each token produced by the tokenizer -> original word that it came from

    labels = []
    mask = []
    prev_word_id = None

    for word_id in word_ids:
        if word_id is None:
            labels.append(0)
            mask.append(0)

        elif word_id != prev_word_id:
            labels.append(tags[word_id])
            mask.append(1)

        else:
            labels.append(0)
            mask.append(0)

        prev_word_id = word_id
    
    tokenized['labels'] = labels
    tokenized['label_mask'] = mask

    return tokenized
