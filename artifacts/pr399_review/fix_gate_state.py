import json

p = "/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json"
d = json.load(open(p))
e = d["prs"]["399"]
e["review_id"] = "5696417699"
e["review_url"] = "https://github.com/PlebeianApp/market/pull/399#pullrequestreview-5696417699"
json.dump(d, open(p, "w"), indent=2)

d2 = json.load(open(p))
e2 = d2["prs"]["399"]
print("review_url:", e2["review_url"])
print("review_id:", e2["review_id"])
print("last_reviewed_sha:", e2["last_reviewed_sha"])
print("disposition:", e2["disposition"])
assert e2["review_url"].endswith("pullrequestreview-5696417699")
assert e2["review_id"] == "5696417699"
print("OK — gate state fixed and valid")