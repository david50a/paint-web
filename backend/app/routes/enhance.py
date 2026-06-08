# backend/app/routes/enhance.py

import cv2
import numpy as np
import io
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from app.utils.imgbb import upload_image_to_imgbb
from app.utils.limiter import limiter

router = APIRouter(
    prefix="/enhance",
    tags=["enhance"]
)

@router.post('/')
@limiter.limit("5/minute")
async def enhance_image(
    request: Request,
    file: UploadFile = File(...)
):
    try:
        # Read uploaded image bytes
        content = await file.read()
        
        # Decode bytes to OpenCV BGR format
        nparr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file or format")
            
        original_height, original_width = img.shape[:2]
        
        # 1. Perspective Warp Correction (Auto-align/straighten photo drawings)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 40, 150)
        
        # Perform morphological closing to connect contours
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)
        
        contours, _ = cv2.findContours(closed.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        
        screen_cnt = None
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                # Quadrilateral found. Ensure it occupies at least 15% of the total canvas size
                area = cv2.contourArea(c)
                total_area = original_width * original_height
                if area > 0.15 * total_area:
                    screen_cnt = approx
                    break
                    
        if screen_cnt is not None:
            # Order points: top-left, top-right, bottom-right, bottom-left
            pts = screen_cnt.reshape(4, 2)
            rect = np.zeros((4, 2), dtype="float32")
            
            # Top-left is min sum, bottom-right is max sum
            s = pts.sum(axis=1)
            rect[0] = pts[np.argmin(s)]
            rect[2] = pts[np.argmax(s)]
            
            # Top-right is min diff, bottom-left is max diff
            diff = np.diff(pts, axis=1)
            rect[1] = pts[np.argmin(diff)]
            rect[3] = pts[np.argmax(diff)]
            
            (tl, tr, br, bl) = rect
            
            # Calculate width
            widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))
            
            # Calculate height
            heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))
            
            # Target warp coordinate mapping
            dst = np.array([
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1]
            ], dtype="float32")
            
            # Warp perspective
            M = cv2.getPerspectiveTransform(rect, dst)
            img = cv2.warpPerspective(img, M, (maxWidth, maxHeight))
        
        # 2. Denoising: bilateral filtering removes pixel noise while keeping edges razor-sharp
        img = cv2.bilateralFilter(img, 9, 75, 75)
        
        # 3. Color and Contrast Enhancement (CLAHE - contrast adaptive histogram equalisation)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2Lab)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        lab_merged = cv2.merge((cl, a, b))
        img = cv2.cvtColor(lab_merged, cv2.COLOR_Lab2BGR)
        
        # 4. Color Saturation Adjustment
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)
        # Boost saturation values by 15%
        s = np.clip(s * 1.15, 0, 255).astype(np.uint8)
        hsv_merged = cv2.merge((h, s, v))
        img = cv2.cvtColor(hsv_merged, cv2.COLOR_HSV2BGR)
        
        # 5. Super-Resolution & Sharpening (Adaptive upscaling)
        # Upscale 2x using Lanczos4 interpolation up to a maximum size of 2048px
        enhanced_width = min(2048, img.shape[1] * 2)
        enhanced_height = min(2048, img.shape[0] * 2)
        
        img_resized = cv2.resize(img, (enhanced_width, enhanced_height), interpolation=cv2.INTER_LANCZOS4)
        
        # Sharpness overlay mask
        blurred_img = cv2.GaussianBlur(img_resized, (0, 0), 3)
        img_enhanced = cv2.addWeighted(img_resized, 1.6, blurred_img, -0.6, 0)
        
        # Encode enhanced BGR image to JPEG bytes
        success, encoded_img = cv2.imencode('.jpg', img_enhanced, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        if not success:
            raise HTTPException(status_code=500, detail="Failed to encode BGR image to JPG")
            
        enhanced_bytes = encoded_img.tobytes()
        
        # Upload enhanced image back to storage
        enhanced_url = await upload_image_to_imgbb(enhanced_bytes)
        
        return {"enhanced_image_url": enhanced_url}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in enhancement route: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image enhancement failed: {str(e)}")
