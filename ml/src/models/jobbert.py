"""
JobBERT NER (Custom Fine-Tuned Model)

This module defines a token classification model based on
`jjzha/jobbert-base-cased`, which is domain-pretrained on job postings
using Masked Language Modeling (MLM).

In this project, the model is fine-tuned on the labeled SkillSpan dataset
for skill extraction using BIO tagging (B-SKILL, I-SKILL, O). This
training is performed by the authors of this project and is intended
for experimental comparison with an existing fine-tuned model.

Backbone:
- jjzha/jobbert-base-cased (domain-pretrained)

Training:
- Supervised fine-tuning on SkillSpan BIO labels

Task:
- Token classification (skill Named Entity Recognition)

Usage:
- Training
- Evaluation
- Inference
"""

import tensorflow as tf
import numpy as np

from data.skillspan.dataloader import load_skillspan_data
from utils.encoder import tokenize_and_align_labels
from utils.dataset import make_dataset
from sklearn.model_selection import train_test_split
from transformers import AutoTokenizer, TFAutoModelForTokenClassification

# load data
data = load_skillspan_data()

train_X = data['train']['tokens']
train_Y = data['train']['tags_skill']

val_X = data['validation']['tokens']
val_Y= data['validation']['tags_skill']

# define labels
label_list = ["O", "B-SKILL", "I-SKILL"]

label2id = {l: i for i, l in enumerate(label_list)}
id2label = {i: l for l, i in label2id.items()}

# load base model
tokenizer = AutoTokenizer.from_pretrained("jjzha/jobbert-base-cased")
model = TFAutoModelForTokenClassification.from_pretrained("jjzha/jobbert-base-cased",
                                                          num_labels=len(label_list),
                                                          id2label=id2label,
                                                          label2id=label2id)

# encode data
train_encoded = [
    tokenize_and_align_labels(tokenizer, tokens, tags)
    for tokens, tags in zip(train_X, train_Y)
]

val_encoded = [
    tokenize_and_align_labels(tokenizer, tokens, tags)
    for tokens, tags in zip(val_X, val_Y)
]

train_data = make_dataset(train_encoded)
val_data = make_dataset(val_encoded)

# callbacks
checkpoint = tf.keras.callbacks.ModelCheckpoint(filepath="ML Model\\models\\trained_models\\jobify_jobbert_v1.keras",
                                                    monitor='val_loss',
                                                    save_best_only=True,
                                                    save_weights_only=False,
                                                    mode='min',
                                                    verbose=1)

stop_training = tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=5, mode='min', verbose=1, restore_best_weights=True)

reduce_lrate = tf.keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=2, verbose=1, mode='min')


# compile and train the model
print("STARTING COMPILING PROCESS:")
model.compile(optimizer= tf.keras.optimizers.Adam(learning_rate=5e-05, epsilon=1e-08, beta_1=0.9, beta_2=0.999),
              loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
              metrics=[
                  tf.keras.metrics.Accuracy(),
                  tf.keras.metrics.Precision(),
                  tf.keras.metrics.Recall()])
print("DONE COMPILING ✅")

print("STARTING TRAINING PROCESS: ")
history = model.fit(train_data, validation_data=val_data, epochs=30, verbose=1, callbacks=[checkpoint, reduce_lrate, stop_training])
print("DONE TRAINING ✅")
np.savez("ML\\models\\training_history\\training_history.npz", **history.history)
print("HISTORY SAVED ✅")