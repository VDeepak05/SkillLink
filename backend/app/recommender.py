import pickle
import numpy as np
import json
from sklearn.metrics.pairwise import cosine_similarity

# Load vectorizer
with open("data/tfidf_vectorizer.pkl", "rb") as f:
    tfidf = pickle.load(f)

# Load vectors
# job_vectors = np.load("data/job_vectors.npy") ---> sparse matrix takes more space as the below is an optimised method
import scipy.sparse as sp

job_vectors = sp.load_npz("data/job_vectors.npz")


# Load metadata (aligned with vectors)
with open("data/job_metadata.json", "r") as f:
    jobs = json.load(f)


def recommend_jobs(profile):
    """
    TF-IDF + cosine similarity recommender
    """

    # Convert profile to text
    profile_text = f"{profile['skills']} {profile['preferred_shift']}"

    # Vectorize student profile
    student_vector = tfidf.transform([profile_text])

    # Compute similarity
    similarities = cosine_similarity(student_vector, job_vectors)[0]

    # Get top 10
    top_indices = similarities.argsort()[-10:][::-1]

    recommendations = []

    for idx in top_indices:
        job = jobs[idx]
        job["score"] = float(similarities[idx])
        recommendations.append(job)

    return recommendations
