import httpx
import os
import base64
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

IMGBB_API_KEY = os.getenv("IMGBB_API_KEY")

async def upload_image_to_imgbb(file_content: bytes) -> str:
    if not IMGBB_API_KEY:
        raise HTTPException(status_code=500, detail="ImgBB API Key not configured")

    url = "https://api.imgbb.com/1/upload"
    
    # ImgBB expects the image to be base64 encoded or a file multipart
    # We'll use base64 for simplicity in this utility
    encoded_image = base64.b64encode(file_content).decode("utf-8")
    
    payload = {
        "key": IMGBB_API_KEY,
        "image": encoded_image,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, data=payload, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            if data.get("success"):
                return data["data"]["url"]
            else:
                raise HTTPException(status_code=500, detail=f"ImgBB upload failed: {data.get('error', {}).get('message', 'Unknown error')}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"ImgBB API error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An error occurred during ImgBB upload: {str(e)}")
