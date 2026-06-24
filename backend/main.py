import os
import json
import uuid
import shutil
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image

# Initialize directories relative to this file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "assets", "data")
PORTFOLIO_IMG_DIR = os.path.join(BASE_DIR, "assets", "portfolio")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PORTFOLIO_IMG_DIR, exist_ok=True)

PORTFOLIO_JSON = os.path.join(DATA_DIR, "portfolio.json")
STORIES_JSON = os.path.join(DATA_DIR, "stories.json")

# Initialize default files if they do not exist
if not os.path.exists(PORTFOLIO_JSON):
    with open(PORTFOLIO_JSON, "w") as f:
        json.dump([], f)
if not os.path.exists(STORIES_JSON):
    with open(STORIES_JSON, "w") as f:
        json.dump([], f)

app = FastAPI(title="Nonimedia CMS API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows local admin dashboard to make calls
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to load JSON files
def load_json(filepath: str) -> list:
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return []

# Helper function to save JSON files
def save_json(filepath: str, data: list):
    try:
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving {filepath}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Database write error: {str(e)}"
        )

# Helper function to compress and convert images to WebP
def save_and_compress_image(file: UploadFile, output_dir: str, prefix: str) -> str:
    # Generate unique filename
    safe_title = "".join([c if c.isalnum() else "_" for c in prefix.lower()])[:20]
    filename = f"{safe_title}_{uuid.uuid4().hex[:6]}.webp"
    file_path = os.path.join(output_dir, filename)

    try:
        # Load image into Pillow
        img = Image.open(file.file)
        # Convert RGBA to RGB if saving to WebP (to ensure standard compatibility)
        if img.mode in ("RGBA", "LA"):
            background = Image.new("RGBA", img.size, (0, 0, 0, 0))
            background.paste(img, mask=img.split()[-1])
            img = background.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")
        
        # Save as WebP with 85% quality
        img.save(file_path, "WEBP", quality=85)
        return filename
    except Exception as e:
        print(f"Error compressing image: {e}")
        # Fallback to copy if compression fails
        file.file.seek(0)
        fallback_filename = f"{safe_title}_{uuid.uuid4().hex[:6]}_{file.filename}"
        fallback_path = os.path.join(output_dir, fallback_filename)
        with open(fallback_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return fallback_filename

# Models for Request Bodies
class PortfolioUpdate(BaseModel):
    title: str
    category: str
    aspect: str

class StoryCreate(BaseModel):
    title: str
    date: str
    excerpt: str
    category: str
    content: str

# Mount static asset folders for media access
app.mount("/assets", StaticFiles(directory=os.path.join(BASE_DIR, "assets")), name="assets")

# ==========================================
# Portfolio Endpoints
# ==========================================

@app.get("/api/portfolio")
def get_portfolio():
    return load_json(PORTFOLIO_JSON)

@app.post("/api/portfolio")
def add_portfolio_item(
    title: str = Form(...),
    category: str = Form(...),
    aspect: str = Form("standard"),
    file: UploadFile = File(...)
):
    # Compress and save image to assets/portfolio/
    img_filename = save_and_compress_image(file, PORTFOLIO_IMG_DIR, title)
    image_url = f"assets/portfolio/{img_filename}"

    # Create new database item record
    items = load_json(PORTFOLIO_JSON)
    new_item = {
        "id": f"portfolio-item-{uuid.uuid4().hex[:8]}",
        "title": title,
        "category": category.lower(),
        "imageUrl": image_url,
        "alt": f"{title} photography by Nonimedia Production Concept",
        "aspect": aspect.lower()
    }
    items.append(new_item)
    save_json(PORTFOLIO_JSON, items)
    return new_item

@app.put("/api/portfolio/{item_id}")
def update_portfolio_item(item_id: str, payload: PortfolioUpdate):
    items = load_json(PORTFOLIO_JSON)
    for item in items:
        if item["id"] == item_id:
            item["title"] = payload.title
            item["category"] = payload.category.lower()
            item["aspect"] = payload.aspect.lower()
            item["alt"] = f"{payload.title} photography by Nonimedia Production Concept"
            save_json(PORTFOLIO_JSON, items)
            return item
    raise HTTPException(status_code=404, detail="Item not found")

@app.delete("/api/portfolio/{item_id}")
def delete_portfolio_item(item_id: str):
    items = load_json(PORTFOLIO_JSON)
    for idx, item in enumerate(items):
        if item["id"] == item_id:
            # Delete physical file
            img_path = os.path.join(BASE_DIR, item["imageUrl"].replace("/", os.sep))
            if os.path.exists(img_path):
                try:
                    os.remove(img_path)
                except Exception as e:
                    print(f"Failed to delete file {img_path}: {e}")
            
            # Delete JSON record
            removed_item = items.pop(idx)
            save_json(PORTFOLIO_JSON, items)
            return {"status": "success", "message": f"Deleted {removed_item['title']}"}
    raise HTTPException(status_code=404, detail="Item not found")

# ==========================================
# Stories (Blog) Endpoints
# ==========================================

@app.get("/api/stories")
def get_stories():
    return load_json(STORIES_JSON)

@app.post("/api/stories")
def add_story(
    title: str = Form(...),
    date: str = Form(...),
    excerpt: str = Form(...),
    category: str = Form(...),
    content: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    cover_image_url = "assets/hero_wedding.webp" # Default fallback
    if file:
        img_filename = save_and_compress_image(file, PORTFOLIO_IMG_DIR, title)
        cover_image_url = f"assets/portfolio/{img_filename}"

    stories = load_json(STORIES_JSON)
    new_story = {
        "id": f"story-{uuid.uuid4().hex[:8]}",
        "title": title,
        "date": date,
        "excerpt": excerpt,
        "coverImage": cover_image_url,
        "category": category,
        "content": content
    }
    stories.append(new_story)
    save_json(STORIES_JSON, stories)
    return new_story

@app.delete("/api/stories/{story_id}")
def delete_story(story_id: str):
    stories = load_json(STORIES_JSON)
    for idx, story in enumerate(stories):
        if story["id"] == story_id:
            # Delete cover image if it is in the upload portfolio folder
            if "assets/portfolio/" in story["coverImage"]:
                img_path = os.path.join(BASE_DIR, story["coverImage"].replace("/", os.sep))
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except Exception as e:
                        print(f"Failed to delete file {img_path}: {e}")
            
            # Delete JSON record
            removed_story = stories.pop(idx)
            save_json(STORIES_JSON, stories)
            return {"status": "success", "message": f"Deleted story {removed_story['title']}"}
    raise HTTPException(status_code=404, detail="Story not found")

# Run FastAPI via Uvicorn if script run directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
