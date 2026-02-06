import tensorflow as tf
from seqeval.metrics import classification_report, f1_score

# convert model outputs and true labels into seqeval-compatible format
def get_seqeval_input(model, dataset, id2label):
    all_preds = []
    all_labels = []

    for batch in dataset:
        input = batch[0]
        true_labels = batch[1]
        weights = batch[2]

        logits = model(input, training=False).logits
        pred_ids = tf.argmax(logits, axis=-1).numpy()
        label_ids = true_labels.numpy()
        weights = weights.numpy()

        for i in range(pred_ids.shape[0]):
            preds, labels = [], []
            
            for j in range(pred_ids.shape[1]):

                if weights[i, j] == 0:
                    continue  # ignore masked tokens

                preds.append(id2label[int(pred_ids[i, j])])
                labels.append(id2label[int(label_ids[i, j])])

            all_preds.append(preds)
            all_labels.append(labels)
            
            all_preds.append(preds)
            all_labels.append(labels)
    
    return all_preds, all_labels



# evaluate the NER model
def evaluate_ner(model, dataset, id2label):
    y_pred, y_true = get_seqeval_input(model, dataset, id2label)
    print(classification_report(y_true, y_pred))
    f1 = f1_score(y_true, y_pred)

    return f1