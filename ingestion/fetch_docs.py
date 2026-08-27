import requests
from bs4 import BeautifulSoup

# Step 1: Fetch the page
url = "https://docs.python.org/3/tutorial/introduction.html"
response = requests.get(url)
response.encoding = response.apparent_encoding

print("Status code:", response.status_code)
print("Raw HTML length:", len(response.text))

# Step 2: Parse it with BeautifulSoup
soup = BeautifulSoup(response.text, "html.parser")

# Step 3: Find the main content
# Python docs wrap the actual content in a div with class "body" or id "content"
main_content = soup.find("div", {"class": "body"})

if main_content:
    # Get clean text, stripping extra whitespace
    text = main_content.get_text(separator="\n", strip=True)
    print("\n--- CLEAN TEXT PREVIEW (first 1000 chars) ---\n")
    print(text[:1000])
else:
    print("Couldn't find main content div — need to inspect HTML structure")