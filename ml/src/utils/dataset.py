import tensorflow as tf

def make_dataset(encodings, batch_size=16):
    input_ids = [e["input_ids"] for e in encodings]
    attention = [e["attention_mask"] for e in encodings]
    labels = [e["labels"] for e in encodings]
    weights = [e["label_mask"] for e in encodings]

    ds = tf.data.Dataset.from_tensor_slices(({"input_ids": input_ids, "attention_mask": attention}, labels, weights))

    return ds.padded_batch(
        batch_size,
        padded_shapes=({"input_ids": [None], "attention_mask": [None]}, [None], [None]),
        padding_values=({"input_ids": 0, "attention_mask": 0}, 0, 0.0)
    ).prefetch(tf.data.AUTOTUNE)