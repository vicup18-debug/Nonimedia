import os
import json
import uuid
import base64
import io
import requests
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, FileResponse
from pydantic import BaseModel
from PIL import Image

# Configuration & Env Variables
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
GITHUB_OWNER = os.environ.get("GITHUB_OWNER", "vicup18-debug")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "Nonimedia")
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main")

# Initialize directories relative to this file (Local Mode Fallback)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "assets", "data")
PORTFOLIO_IMG_DIR = os.path.join(BASE_DIR, "assets", "portfolio")

# Ensure directories exist locally
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PORTFOLIO_IMG_DIR, exist_ok=True)

PORTFOLIO_JSON = os.path.join(DATA_DIR, "portfolio.json")
STORIES_JSON = os.path.join(DATA_DIR, "stories.json")

# Initialize local fallback databases if missing
if not os.path.exists(PORTFOLIO_JSON):
    with open(PORTFOLIO_JSON, "w") as f:
        json.dump([], f)
if not os.path.exists(STORIES_JSON):
    with open(STORIES_JSON, "w") as f:
        json.dump([], f)

app = FastAPI(title="Nonimedia CMS Cloud API")

# Enable CORS for localhost and live admin dashboard connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# GitHub REST API Client Helper
# ==========================================
class GitHubClient:
    def __init__(self, token: str, owner: str, repo: str, branch: str = "main"):
        self.token = token
        self.owner = owner
        self.repo = repo
        self.branch = branch
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
    def get_file(self, path: str):
        url = f"https://api.github.com/repos/{self.owner}/{self.repo}/contents/{path}?ref={self.branch}"
        r = requests.get(url, headers=self.headers)
        if r.status_code == 200:
            data = r.json()
            content_b64 = data["content"].replace("\n", "").replace("\r", "")
            content = base64.b64decode(content_b64)
            return content, data["sha"]
        elif r.status_code == 404:
            return None, None
        else:
            raise HTTPException(
                status_code=r.status_code, 
                detail=f"GitHub API Error: {r.json().get('message', r.text)}"
            )
            
    def commit_file(self, path: str, content_bytes: bytes, message: str, sha: Optional[str] = None):
        url = f"https://api.github.com/repos/{self.owner}/{self.repo}/contents/{path}"
        content_b64 = base64.b64encode(content_bytes).decode("utf-8")
        
        payload = {
            "message": message,
            "content": content_b64,
            "branch": self.branch
        }
        if sha:
            payload["sha"] = sha
            
        r = requests.put(url, headers=self.headers, json=payload)
        if r.status_code in (200, 201):
            return r.json()
        else:
            raise HTTPException(
                status_code=r.status_code, 
                detail=f"GitHub Commit Error: {r.json().get('message', r.text)}"
            )

    def delete_file(self, path: str, sha: str, message: str):
        url = f"https://api.github.com/repos/{self.owner}/{self.repo}/contents/{path}"
        payload = {
            "message": message,
            "sha": sha,
            "branch": self.branch
        }
        r = requests.delete(url, headers=self.headers, json=payload)
        if r.status_code in (200, 204):
            return r.json()
        else:
            raise HTTPException(
                status_code=r.status_code, 
                detail=f"GitHub Delete Error: {r.json().get('message', r.text)}"
            )

# Instantiate GitHub Client if GITHUB_TOKEN is available
github_client = None
if GITHUB_TOKEN:
    github_client = GitHubClient(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH)
    print(f"--- Running in CLOUD Mode (GitHub Integration Active: {GITHUB_OWNER}/{GITHUB_REPO}) ---")
else:
    print("--- Running in LOCAL Mode (Disk writes active) ---")

# ==========================================
# Helper functions for Local mode
# ==========================================
def load_local_json(filepath: str) -> list:
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_local_json(filepath: str, data: list):
    try:
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Local DB write error: {str(e)}")

# ==========================================
# Dynamic Asset Proxy Route
# ==========================================
@app.get("/assets/{path:path}")
def get_asset(path: str):
    if GITHUB_TOKEN:
        # Redirect to raw GitHub URL to fetch files dynamically from the repo
        github_raw_url = f"https://raw.githubusercontent.com/{GITHUB_OWNER}/{GITHUB_REPO}/{GITHUB_BRANCH}/assets/{path}"
        return RedirectResponse(url=github_raw_url)
    else:
        # Local Mode: serve file directly from local disk
        local_path = os.path.join(BASE_DIR, "assets", path.replace("/", os.sep))
        if os.path.exists(local_path):
            return FileResponse(local_path)
        raise HTTPException(status_code=404, detail="Asset not found")

# ==========================================
# In-Memory Image WebP Compression Helper
# ==========================================
def compress_image_bytes(file_bytes: bytes, filename: str, quality: int = 85) -> bytes:
    try:
        img = Image.open(io.BytesIO(file_bytes))
        # Ensure RGB conversion for WebP compatibility
        if img.mode in ("RGBA", "LA"):
            background = Image.new("RGBA", img.size, (0, 0, 0, 0))
            background.paste(img, mask=img.split()[-1])
            img = background.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")
            
        out_buf = io.BytesIO()
        img.save(out_buf, "WEBP", quality=quality)
        return out_buf.getvalue()
    except Exception as e:
        print(f"Error compressing image: {e}")
        return file_bytes

# Models for Request Bodies
class PortfolioUpdate(BaseModel):
    title: str
    category: str
    aspect: str

# ==========================================
# Portfolio Endpoints
# ==========================================

@app.get("/api/portfolio")
def get_portfolio():
    if github_client:
        content, _ = github_client.get_file("assets/data/portfolio.json")
        if content:
            return json.loads(content.decode("utf-8"))
        return []
    else:
        return load_local_json(PORTFOLIO_JSON)

@app.post("/api/portfolio")
async def add_portfolio_item(
    title: str = Form(...),
    category: str = Form(...),
    aspect: str = Form("standard"),
    file: UploadFile = File(...)
):
    file_bytes = await file.read()
    compressed_bytes = compress_image_bytes(file_bytes, file.filename)
    
    # Generate unique WebP filename
    safe_title = "".join([c if c.isalnum() else "_" for c in title.lower()])[:20]
    filename = f"{safe_title}_{uuid.uuid4().hex[:6]}.webp"
    image_url = f"assets/portfolio/{filename}"

    new_item = {
        "id": f"portfolio-item-{uuid.uuid4().hex[:8]}",
        "title": title,
        "category": category.lower(),
        "imageUrl": image_url,
        "alt": f"{title} photography by Nonimedia Production Concept",
        "aspect": aspect.lower()
    }

    if github_client:
        # 1. Commit image to GitHub
        github_client.commit_file(f"assets/portfolio/{filename}", compressed_bytes, f"Upload portfolio image: {filename}")
        
        # 2. Get current portfolio database and SHA
        content, sha = github_client.get_file("assets/data/portfolio.json")
        items = json.loads(content.decode("utf-8")) if content else []
        
        # 3. Append and update portfolio database on GitHub
        items.append(new_item)
        github_client.commit_file(
            "assets/data/portfolio.json", 
            json.dumps(items, indent=2).encode("utf-8"), 
            "Update portfolio database record", 
            sha
        )
    else:
        # Local Mode: Save file to disk
        local_image_path = os.path.join(PORTFOLIO_IMG_DIR, filename)
        with open(local_image_path, "wb") as f:
            f.write(compressed_bytes)
            
        items = load_local_json(PORTFOLIO_JSON)
        items.append(new_item)
        save_local_json(PORTFOLIO_JSON, items)

    return new_item

@app.put("/api/portfolio/{item_id}")
def update_portfolio_item(item_id: str, payload: PortfolioUpdate):
    if github_client:
        content, sha = github_client.get_file("assets/data/portfolio.json")
        items = json.loads(content.decode("utf-8")) if content else []
        
        for item in items:
            if item["id"] == item_id:
                item["title"] = payload.title
                item["category"] = payload.category.lower()
                item["aspect"] = payload.aspect.lower()
                item["alt"] = f"{payload.title} photography by Nonimedia Production Concept"
                
                github_client.commit_file(
                    "assets/data/portfolio.json", 
                    json.dumps(items, indent=2).encode("utf-8"), 
                    f"Update portfolio item: {payload.title}", 
                    sha
                )
                return item
        raise HTTPException(status_code=404, detail="Item not found")
    else:
        items = load_local_json(PORTFOLIO_JSON)
        for item in items:
            if item["id"] == item_id:
                item["title"] = payload.title
                item["category"] = payload.category.lower()
                item["aspect"] = payload.aspect.lower()
                item["alt"] = f"{payload.title} photography by Nonimedia Production Concept"
                save_local_json(PORTFOLIO_JSON, items)
                return item
        raise HTTPException(status_code=404, detail="Item not found")

@app.delete("/api/portfolio/{item_id}")
def delete_portfolio_item(item_id: str):
    if github_client:
        # Get portfolio JSON database
        content, sha = github_client.get_file("assets/data/portfolio.json")
        items = json.loads(content.decode("utf-8")) if content else []
        
        for idx, item in enumerate(items):
            if item["id"] == item_id:
                # 1. Update JSON database on GitHub
                removed_item = items.pop(idx)
                github_client.commit_file(
                    "assets/data/portfolio.json",
                    json.dumps(items, indent=2).encode("utf-8"),
                    f"Delete portfolio item record: {removed_item['title']}",
                    sha
                )
                
                # 2. Try to delete the physical image file from GitHub
                img_path = removed_item["imageUrl"]
                _, img_sha = github_client.get_file(img_path)
                if img_sha:
                    try:
                        github_client.delete_file(img_path, img_sha, f"Delete portfolio image file: {img_path}")
                    except Exception as e:
                        print(f"Failed to delete file {img_path} from GitHub: {e}")
                        
                return {"status": "success", "message": f"Deleted {removed_item['title']}"}
        raise HTTPException(status_code=404, detail="Item not found")
    else:
        items = load_local_json(PORTFOLIO_JSON)
        for idx, item in enumerate(items):
            if item["id"] == item_id:
                # Delete physical file locally
                img_path = os.path.join(BASE_DIR, item["imageUrl"].replace("/", os.sep))
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except Exception as e:
                        print(f"Failed to delete local file {img_path}: {e}")
                
                removed_item = items.pop(idx)
                save_local_json(PORTFOLIO_JSON, items)
                return {"status": "success", "message": f"Deleted {removed_item['title']}"}
        raise HTTPException(status_code=404, detail="Item not found")

# ==========================================
# Stories (Blog) Endpoints
# ==========================================

@app.get("/api/stories")
def get_stories():
    if github_client:
        content, _ = github_client.get_file("assets/data/stories.json")
        if content:
            return json.loads(content.decode("utf-8"))
        return []
    else:
        return load_local_json(STORIES_JSON)

@app.post("/api/stories")
async def add_story(
    title: str = Form(...),
    date: str = Form(...),
    excerpt: str = Form(...),
    category: str = Form(...),
    content: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    cover_image_url = "assets/hero_wedding.webp"  # Default fallback
    compressed_bytes = None
    filename = None
    
    if file:
        file_bytes = await file.read()
        compressed_bytes = compress_image_bytes(file_bytes, file.filename)
        safe_title = "".join([c if c.isalnum() else "_" for c in title.lower()])[:20]
        filename = f"{safe_title}_{uuid.uuid4().hex[:6]}.webp"
        cover_image_url = f"assets/portfolio/{filename}"

    new_story = {
        "id": f"story-{uuid.uuid4().hex[:8]}",
        "title": title,
        "date": date,
        "excerpt": excerpt,
        "coverImage": cover_image_url,
        "category": category,
        "content": content
    }

    if github_client:
        # 1. Commit cover image if uploaded
        if compressed_bytes and filename:
            github_client.commit_file(f"assets/portfolio/{filename}", compressed_bytes, f"Upload cover image: {filename}")
            
        # 2. Get current stories and SHA from GitHub
        db_content, sha = github_client.get_file("assets/data/stories.json")
        stories = json.loads(db_content.decode("utf-8")) if db_content else []
        
        # 3. Append and update stories database on GitHub
        stories.append(new_story)
        github_client.commit_file(
            "assets/data/stories.json",
            json.dumps(stories, indent=2).encode("utf-8"),
            f"Update stories database: {title}",
            sha
        )
    else:
        # Local Mode: Save cover image to disk if uploaded
        if compressed_bytes and filename:
            local_image_path = os.path.join(PORTFOLIO_IMG_DIR, filename)
            with open(local_image_path, "wb") as f:
                f.write(compressed_bytes)
                
        stories = load_local_json(STORIES_JSON)
        stories.append(new_story)
        save_local_json(STORIES_JSON, stories)

    return new_story

@app.delete("/api/stories/{story_id}")
def delete_story(story_id: str):
    if github_client:
        # Get stories JSON database
        db_content, sha = github_client.get_file("assets/data/stories.json")
        stories = json.loads(db_content.decode("utf-8")) if db_content else []
        
        for idx, story in enumerate(stories):
            if story["id"] == story_id:
                # 1. Update JSON database on GitHub
                removed_story = stories.pop(idx)
                github_client.commit_file(
                    "assets/data/stories.json",
                    json.dumps(stories, indent=2).encode("utf-8"),
                    f"Delete story record: {removed_story['title']}",
                    sha
                )
                
                # 2. Delete cover photo from GitHub if custom uploaded
                cover_image = removed_story["coverImage"]
                if "assets/portfolio/" in cover_image:
                    _, img_sha = github_client.get_file(cover_image)
                    if img_sha:
                        try:
                            github_client.delete_file(cover_image, img_sha, f"Delete story cover file: {cover_image}")
                        except Exception as e:
                            print(f"Failed to delete story cover {cover_image} from GitHub: {e}")
                            
                return {"status": "success", "message": f"Deleted story {removed_story['title']}"}
        raise HTTPException(status_code=404, detail="Story not found")
    else:
        stories = load_local_json(STORIES_JSON)
        for idx, story in enumerate(stories):
            if story["id"] == story_id:
                # Delete cover photo from disk if custom uploaded
                cover_image = story["coverImage"]
                if "assets/portfolio/" in cover_image:
                    local_img_path = os.path.join(BASE_DIR, cover_image.replace("/", os.sep))
                    if os.path.exists(local_img_path):
                        try:
                            os.remove(local_img_path)
                        except Exception as e:
                            print(f"Failed to delete local file {local_img_path}: {e}")
                            
                removed_story = stories.pop(idx)
                save_local_json(STORIES_JSON, stories)
                return {"status": "success", "message": f"Deleted story {removed_story['title']}"}
        raise HTTPException(status_code=404, detail="Story not found")

# Run FastAPI via Uvicorn if script run directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
