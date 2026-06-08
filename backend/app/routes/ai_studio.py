import sys
import os
import torch
import io
import json
import uuid
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer

from app.database import get_db
from app import models
from app import schemas
from app import oauth2
from app.utils.imgbb import upload_image_to_imgbb
from app.utils.limiter import limiter

# Add stable_diffusion/sd to python path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SD_DIR = os.path.join(BACKEND_DIR, "..", "stable_diffusion", "sd")
if SD_DIR not in sys.path:
    sys.path.append(SD_DIR)

import model_loder
import pipeline
from transformers import CLIPTokenizer

# Lazy loaded SD variables
_models = None
_tokenizer = None
_device = None
_sentence_model = None

def get_sentence_model():
    global _sentence_model
    if _sentence_model is None:
        _sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _sentence_model

def load_sd_models():
    global _models, _tokenizer, _device
    if _models is None:
        print("Initializing Stable Diffusion model and loading weights...")
        try:
            _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            DATA_DIR = os.path.join(SD_DIR, "..", "data")
            _tokenizer = CLIPTokenizer(os.path.join(DATA_DIR, 'vocab.json'), os.path.join(DATA_DIR, 'merges.txt'))
            model_file = os.path.join(DATA_DIR, 'v1-5-pruned-emaonly.ckpt')
            
            if not os.path.exists(model_file):
                raise FileNotFoundError(f"Model checkpoint not found at {model_file}")
                
            _models = model_loder.preload_models_from_standard_weights(model_file, _device)
            print("Stable Diffusion models preloaded successfully!")
        except Exception as e:
            print(f"Error loading Stable Diffusion models: {str(e)}")
            raise e
    return _models, _tokenizer, _device

router = APIRouter(
    prefix="/ai-studio",
    tags=["ai-studio"]
)

class AIGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=500, description="Text prompt for the image")
    negative_prompt: Optional[str] = Field("", description="Negative prompt to avoid elements")
    num_inference_steps: Optional[int] = Field(20, ge=1, le=50, description="Number of denoising steps")
    guidance_scale: Optional[float] = Field(7.5, ge=1.0, le=20.0, description="Classifier-free guidance scale")
    seed: Optional[int] = Field(None, description="Random seed")
    publish: Optional[bool] = Field(False, description="Whether to directly publish this image as a post")
    post_title: Optional[str] = Field("", description="Title for the post, if published")
    post_description: Optional[str] = Field("", description="Description/content for the post, if published")

class AIGenerateResponse(BaseModel):
    image_url: str
    published_post_id: Optional[int] = None

@router.post('/generate', response_model=AIGenerateResponse)
@limiter.limit("5/minute")
async def generate_artwork(
    request: Request,
    body: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    try:
        models_dict, tokenizer, device = load_sd_models()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Stable Diffusion model initialization failed: {str(e)}"
        )

    # Use specified seed or default/random one
    generation_seed = body.seed if body.seed is not None else int(uuid.uuid4().int & 0xFFFFFFFF)

    print(f"Generating image on {device} for user {current_user.username} with seed {generation_seed}...")
    try:
        # Generate the image array (height, width, 3)
        output_image = pipeline.generate(
            prompt=body.prompt,
            negative_prompt=body.negative_prompt,
            do_cfg=True,
            cfg_scale=body.guidance_scale,
            input_image=None,
            strength=0.8,
            sample_name='ddpm',
            seed=generation_seed,
            n_interface_steps=body.num_inference_steps,
            device=device,
            models=models_dict,
            idle_device='cpu',
            tokenizer=tokenizer
        )
        
        # Save array to JPEG in-memory buffer
        img = Image.fromarray(output_image)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=90, optimize=True)
        img_bytes = buffer.getvalue()
        
        # Upload to ImgBB
        image_url = await upload_image_to_imgbb(img_bytes)
        
    except Exception as e:
        print(f"Generation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during image generation or upload: {str(e)}"
        )

    published_post_id = None

    if body.publish:
        try:
            # If auto-publishing, set default title/desc if empty
            title = body.post_title.strip() if body.post_title else f"AI Studio: {body.prompt[:40]}"
            description = body.post_description.strip() if body.post_description else f"Generated in AI Studio.\nPrompt: {body.prompt}"
            
            # Compute sentence embedding
            embedding = None
            text_to_embed = f"{title} {description}".strip()
            if text_to_embed:
                s_model = get_sentence_model()
                embedding = json.dumps(s_model.encode(text_to_embed).tolist())

            new_post = models.Post(
                user_id=current_user.id,
                title=title,
                content=description,
                image_url=image_url,
                embedding=embedding
            )
            db.add(new_post)
            db.commit()
            db.refresh(new_post)
            published_post_id = new_post.id
            print(f"Published generated artwork as post ID: {published_post_id}")
        except Exception as e:
            print(f"Failed to publish generated image as post: {str(e)}")
            # Don't fail the request completely since image generation succeeded
            # But let user know image was generated but publishing failed

    return AIGenerateResponse(
        image_url=image_url,
        published_post_id=published_post_id
    )
