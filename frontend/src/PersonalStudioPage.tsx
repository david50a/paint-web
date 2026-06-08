/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Undo, Redo, ZoomIn, ZoomOut, Maximize2, Download, 
  Share2, Plus, Trash2, Eye, EyeOff, MoveUp, MoveDown, 
  FileDown, FileUp, Paintbrush, Eraser, Pipette, Hand, 
  Check, Loader2, ChevronDown, Copy, RefreshCw, X, Edit3,
  Sparkles, Video, VideoOff, SlidersHorizontal, Sparkle
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { useAuth } from './context/AuthContext';
import { createPost } from './api/posts';
import { API_BASE } from './api/client';
import { generateAIImage } from './api/aiStudio';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0 to 1
  blendMode: string; // normal, multiply, screen, overlay, etc.
  thumbnail: string; // base64 PNG thumbnail data URL
}

interface CanvasSnapshot {
  layers: {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    blendMode: string;
    imageData: string; // full data URL of layer content
  }[];
  activeLayerId: string;
}

export const PersonalStudioPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Canvas size configuration
  const canvasWidth = 1024;
  const canvasHeight = 1024;

  // Layer state
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-bg', name: 'Background Color', visible: true, opacity: 1.0, blendMode: 'normal', thumbnail: '' },
    { id: 'layer-1', name: 'Layer 1', visible: true, opacity: 1.0, blendMode: 'normal', thumbnail: '' }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-1');

  // Left Panel tabs
  const [activeLeftTab, setActiveLeftTab] = useState<'paint' | 'ai'>('paint');

  // Tool state
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'eyedropper' | 'pan' | 'smudge'>('brush');
  const [brushType, setBrushType] = useState<'pen' | 'airbrush' | 'pencil' | 'calligraphy'>('pen');
  const [brushSize, setBrushSize] = useState<number>(15);
  const [brushOpacity, setBrushOpacity] = useState<number>(100); // 0 to 100
  const [streamline, setStreamline] = useState<number>(0.4); // 0 to 0.9 (stabilization)

  // Color picker state
  const [activeColor, setActiveColor] = useState<string>('#A68A64'); // Default gold
  const [hue, setHue] = useState<number>(36); // Hue for active gold (0 to 360)
  const [sat, setSat] = useState<number>(38); // Saturation %
  const [val, setVal] = useState<number>(65); // Value %
  const [showColorPicker, setShowColorPicker] = useState<boolean>(true);

  // AI Prompt Layer Generator state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiNegativePrompt, setAiNegativePrompt] = useState<string>('');
  const [aiSteps, setAiSteps] = useState<number>(20);
  const [aiCfgScale, setAiCfgScale] = useState<number>(7.5);
  const [aiSeed, setAiSeed] = useState<string>('');
  const [isAIGenerating, setIsAIGenerating] = useState<boolean>(false);
  const [aiProgressMessage, setAiProgressMessage] = useState<string>('');
  const [showAdvancedAI, setShowAdvancedAI] = useState<boolean>(false);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(0.6); // Default fit-ish scale
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 150, y: 50 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isDraggingPan, setIsDraggingPan] = useState<boolean>(false);

  // Floating Brush Cursor Preview state
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHoveringCanvas, setIsHoveringCanvas] = useState<boolean>(false);

  // Publish / Share modal state
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [publishTitle, setPublishTitle] = useState<string>('');
  const [publishDesc, setPublishDesc] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Layer rename state
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  // AI Enhancer state
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhanceProgressMessage, setEnhanceProgressMessage] = useState<string>('');

  // Speedpaint Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Refs for drawing performance (avoid react re-render cycles)
  const isDrawingRef = useRef<boolean>(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const prevMidPointRef = useRef<{ x: number; y: number } | null>(null);
  
  // Brush sprites and smudge buffers
  const brushSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const smudgeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Undo/Redo stacks
  const undoStack = useRef<CanvasSnapshot[]>([]);
  const redoStack = useRef<CanvasSnapshot[]>([]);

  // DOM Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorPickerSVBoxRef = useRef<HTMLDivElement>(null);
  const enhanceFileInputRef = useRef<HTMLInputElement>(null);
  
  // Media Recording Refs
  const recorderCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  
  // Track pan dragging start coordinates
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Keyboard shortcut configuration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space key for pan mode
      if (e.code === 'Space' && !isSpacePressed) {
        const activeEl = document.activeElement;
        // Don't override if typing in an input/textarea
        if (activeEl?.tagName !== 'INPUT' && activeEl?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      }

      // Hotkeys: B (Brush), E (Eraser), I/Alt (Eyedropper)
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        const char = e.key.toLowerCase();
        if (char === 'b') {
          setActiveTool('brush');
        } else if (char === 'e') {
          setActiveTool('eraser');
        } else if (char === 'i') {
          setActiveTool('eyedropper');
        } else if (char === 'p') {
          setActiveTool('pan');
        } else if (char === 's') {
          setActiveTool('smudge');
        } else if (e.key === '[') {
          setBrushSize(prev => Math.max(1, prev - 2));
        } else if (e.key === ']') {
          setBrushSize(prev => Math.min(100, prev + 2));
        } else if (e.key === 'Escape') {
          // Reset zoom & pan
          resetView();
        }
      }

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

  // Initializing canvas contents
  useEffect(() => {
    // Fill the background layer with white initially
    const bgCanvas = document.getElementById('layer-canvas-layer-bg') as HTMLCanvasElement;
    if (bgCanvas) {
      const ctx = bgCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        updateLayerThumbnail('layer-bg');
      }
    }
    // Update Layer 1 thumbnail initially (blank transparent)
    updateLayerThumbnail('layer-1');
  }, []);

  // Continuous composite drawing loop when recording speedpaint (keeps recorder canvas up to date at 30 FPS)
  useEffect(() => {
    let animId: number;
    const drawCompositeFrame = () => {
      if (isRecording && recorderCanvasRef.current) {
        const rCtx = recorderCanvasRef.current.getContext('2d')!;
        
        // Solid white backdrop
        rCtx.fillStyle = '#ffffff';
        rCtx.fillRect(0, 0, canvasWidth, canvasHeight);

        layers.forEach(layer => {
          if (layer.visible) {
            rCtx.save();
            rCtx.globalAlpha = layer.opacity;
            rCtx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : layer.blendMode as any;
            const canvas = document.getElementById(`layer-canvas-${layer.id}`) as HTMLCanvasElement;
            if (canvas) {
              rCtx.drawImage(canvas, 0, 0);
            }
            rCtx.restore();
          }
        });
      }
      animId = requestAnimationFrame(drawCompositeFrame);
    };

    if (isRecording) {
      drawCompositeFrame();
    }
    return () => cancelAnimationFrame(animId);
  }, [isRecording, layers]);

  // Sync active color and brush sprite on tool config change
  useEffect(() => {
    const hex = activeColor;
    const size = brushSize;
    const opacity = brushOpacity / 100;
    
    // Parse Hex color to rgba to preserve brush transparency
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    const colorStr = `rgba(${r}, ${g}, ${b}, ${opacity})`;

    const sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const sCtx = sprite.getContext('2d')!;

    if (brushType === 'pen') {
      sCtx.fillStyle = colorStr;
      sCtx.beginPath();
      sCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      sCtx.fill();
    } else if (brushType === 'airbrush') {
      const grad = sCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, colorStr);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      sCtx.fill();
    } else if (brushType === 'pencil') {
      // Textured sketchy brush
      const grad = sCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, colorStr);
      grad.addColorStop(0.4, colorStr);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      sCtx.fill();

      // Mask pixels to create noise
      const imgData = sCtx.getImageData(0, 0, size, size);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          if (Math.random() > 0.4) {
            data[i + 3] = Math.max(0, data[i + 3] - Math.random() * 180);
          }
        }
      }
      sCtx.putImageData(imgData, 0, 0);
    } else if (brushType === 'calligraphy') {
      sCtx.save();
      sCtx.translate(size / 2, size / 2);
      sCtx.rotate(Math.PI / 4); // 45 degrees
      sCtx.scale(1.0, 0.25); // flat oval
      sCtx.fillStyle = colorStr;
      sCtx.beginPath();
      sCtx.arc(0, 0, size / 2, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.restore();
    }

    brushSpriteRef.current = sprite;
  }, [activeColor, brushType, brushSize, brushOpacity]);

  // Center/Fit Canvas Viewport
  const resetView = () => {
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const isLargeScreen = rect.width > 1150;
      const leftOffset = isLargeScreen ? 312 : 20;
      const rightOffset = isLargeScreen ? 344 : 20;
      const topOffset = 100;
      
      const visibleWidth = rect.width - leftOffset - rightOffset;
      const visibleHeight = rect.height - topOffset - 40;

      const newZoom = Math.min(
        (visibleWidth) / canvasWidth,
        (visibleHeight) / canvasHeight,
        0.85
      );
      
      setZoom(newZoom);
      setPan({
        x: leftOffset + (visibleWidth - canvasWidth * newZoom) / 2,
        y: topOffset + (visibleHeight - canvasHeight * newZoom) / 2
      });
    }
  };

  // Run on load to fit canvas automatically
  useEffect(() => {
    resetView();
    const t1 = setTimeout(resetView, 100);
    const t2 = setTimeout(resetView, 500);
    
    window.addEventListener('resize', resetView);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', resetView);
    };
  }, []);

  // Update Hue, Sat, Val to Hex conversion
  const updateHexFromHSV = (h: number, s: number, v: number) => {
    const hexVal = hsvToHex(h, s, v);
    setActiveColor(hexVal);
  };

  // Core Undo/Redo Engine Helpers
  const pushUndo = () => {
    const snapshot: CanvasSnapshot = {
      activeLayerId,
      layers: layers.map(layer => {
        const canvas = document.getElementById(`layer-canvas-${layer.id}`) as HTMLCanvasElement;
        const imageData = canvas ? canvas.toDataURL('image/png') : '';
        return {
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          blendMode: layer.blendMode,
          imageData
        };
      })
    };
    undoStack.current.push(snapshot);
    if (undoStack.current.length > 25) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  };

  const handleUndo = () => {
    if (undoStack.current.length === 0) return;
    
    const currentSnapshot: CanvasSnapshot = {
      activeLayerId,
      layers: layers.map(layer => {
        const canvas = document.getElementById(`layer-canvas-${layer.id}`) as HTMLCanvasElement;
        const imageData = canvas ? canvas.toDataURL('image/png') : '';
        return {
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          blendMode: layer.blendMode,
          imageData
        };
      })
    };
    redoStack.current.push(currentSnapshot);

    const prevSnapshot = undoStack.current.pop()!;
    restoreSnapshot(prevSnapshot);
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) return;

    const currentSnapshot: CanvasSnapshot = {
      activeLayerId,
      layers: layers.map(layer => {
        const canvas = document.getElementById(`layer-canvas-${layer.id}`) as HTMLCanvasElement;
        const imageData = canvas ? canvas.toDataURL('image/png') : '';
        return {
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          blendMode: layer.blendMode,
          imageData
        };
      })
    };
    undoStack.current.push(currentSnapshot);

    const nextSnapshot = redoStack.current.pop()!;
    restoreSnapshot(nextSnapshot);
  };

  const restoreSnapshot = (snapshot: CanvasSnapshot) => {
    setLayers(snapshot.layers.map(l => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      opacity: l.opacity,
      blendMode: l.blendMode,
      thumbnail: ''
    })));
    setActiveLayerId(snapshot.activeLayerId);

    setTimeout(() => {
      snapshot.layers.forEach(l => {
        const canvas = document.getElementById(`layer-canvas-${l.id}`) as HTMLCanvasElement;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            if (l.imageData) {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, 0, 0);
                updateLayerThumbnail(l.id);
              };
              img.src = l.imageData;
            }
          }
        }
      });
    }, 50);
  };

  // Update Thumbnail utility
  const updateLayerThumbnail = (layerId: string) => {
    const canvas = document.getElementById(`layer-canvas-${layerId}`) as HTMLCanvasElement;
    if (!canvas) return;

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 64;
    thumbCanvas.height = 64;
    const thumbCtx = thumbCanvas.getContext('2d')!;
    
    thumbCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 64, 64);
    const dataUrl = thumbCanvas.toDataURL('image/png');

    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, thumbnail: dataUrl } : l));
  };

  // Zoom to point logic (Wheel zoom)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasX = (mouseX - pan.x) / zoom;
    const canvasY = (mouseY - pan.y) / zoom;

    const scaleFactor = 1.12;
    let newZoom = zoom;

    if (e.deltaY < 0) {
      newZoom = Math.min(zoom * scaleFactor, 15);
    } else {
      newZoom = Math.max(zoom / scaleFactor, 0.08);
    }

    const newPanX = mouseX - canvasX * newZoom;
    const newPanY = mouseY - canvasY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Pointer Event handlers (Drawing & Eyedropping)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!viewportRef.current) return { x: 0, y: 0 };
    const rect = viewportRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // tablet pressure sensor utility
  const getPressureScale = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return 1.0;
    return e.pressure > 0 ? e.pressure : 1.0;
  };

  // Eyedropper sampling logic
  const sampleColor = (x: number, y: number) => {
    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return;

    const sampler = document.createElement('canvas');
    sampler.width = 1;
    sampler.height = 1;
    const sCtx = sampler.getContext('2d')!;

    layers.forEach(layer => {
      if (layer.visible) {
        sCtx.save();
        sCtx.globalAlpha = layer.opacity;
        sCtx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : layer.blendMode as any;
        const canvas = document.getElementById(`layer-canvas-${layer.id}`) as HTMLCanvasElement;
        if (canvas) {
          sCtx.drawImage(canvas, x, y, 1, 1, 0, 0, 1, 1);
        }
        sCtx.restore();
      }
    });

    const [r, g, b, a] = sCtx.getImageData(0, 0, 1, 1).data;
    if (a === 0) {
      setActiveColor('#ffffff');
      setHue(0);
      setSat(0);
      setVal(100);
      return;
    }

    const hex = rgbToHex(r, g, b);
    setActiveColor(hex);
    
    const [h, s, v] = rgbToHSV(r, g, b);
    setHue(h);
    setSat(s);
    setVal(v);
  };

  const drawStrokeSegment = (
    ctx: CanvasRenderingContext2D,
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    currentSize: number
  ) => {
    ctx.save();

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    const sprite = brushSpriteRef.current;
    if (sprite) {
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const step = Math.max(0.5, currentSize * 0.05);
      const steps = Math.max(1, Math.floor(dist / step));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;
        
        ctx.drawImage(sprite, x - currentSize / 2, y - currentSize / 2, currentSize, currentSize);
      }
    } else {
      // Fallback
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = currentSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || activeTool === 'pan' || isSpacePressed) {
      setIsDraggingPan(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      viewportRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (activeTool === 'eyedropper') {
      isDrawingRef.current = true;
      sampleColor(x, y);
      viewportRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    pushUndo();

    isDrawingRef.current = true;
    pointsRef.current = [{ x, y }];
    prevMidPointRef.current = null;

    const canvas = document.getElementById(`layer-canvas-${activeLayerId}`) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pScale = getPressureScale(e);
    const size = brushSize * (0.35 + pScale * 0.65);

    if (activeTool === 'smudge') {
      const sCanvas = document.createElement('canvas');
      sCanvas.width = brushSize;
      sCanvas.height = brushSize;
      const sCtx = sCanvas.getContext('2d')!;

      sCtx.save();
      sCtx.beginPath();
      sCtx.arc(brushSize / 2, brushSize / 2, brushSize / 2, 0, Math.PI * 2);
      sCtx.clip();

      sCtx.drawImage(canvas, x - brushSize / 2, y - brushSize / 2, brushSize, brushSize, 0, 0, brushSize, brushSize);
      sCtx.restore();

      smudgeCanvasRef.current = sCanvas;
    } else {
      drawStrokeSegment(ctx, { x, y }, { x, y }, size);
    }

    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    if (isDraggingPan) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (!isDrawingRef.current) return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (activeTool === 'eyedropper') {
      sampleColor(x, y);
      return;
    }

    const canvas = document.getElementById(`layer-canvas-${activeLayerId}`) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pScale = getPressureScale(e);
    const size = brushSize * (0.35 + pScale * 0.65);

    const lastPoint = pointsRef.current[pointsRef.current.length - 1];
    
    const smoothedX = lastPoint.x + (x - lastPoint.x) * (1 - streamline);
    const smoothedY = lastPoint.y + (y - lastPoint.y) * (1 - streamline);

    const distToLast = Math.hypot(smoothedX - lastPoint.x, smoothedY - lastPoint.y);
    if (distToLast < 0.5) return;

    pointsRef.current.push({ x: smoothedX, y: smoothedY });

    if (activeTool === 'smudge') {
      const smudgeCanvas = smudgeCanvasRef.current;
      if (smudgeCanvas) {
        ctx.save();
        ctx.globalAlpha = 0.35; 
        ctx.drawImage(smudgeCanvas, smoothedX - brushSize / 2, smoothedY - brushSize / 2, brushSize, brushSize);
        ctx.restore();

        const sCtx = smudgeCanvas.getContext('2d')!;
        sCtx.clearRect(0, 0, brushSize, brushSize);
        sCtx.save();
        sCtx.beginPath();
        sCtx.arc(brushSize / 2, brushSize / 2, brushSize / 2, 0, Math.PI * 2);
        sCtx.clip();
        sCtx.drawImage(canvas, smoothedX - brushSize / 2, smoothedY - brushSize / 2, brushSize, brushSize, 0, 0, brushSize, brushSize);
        sCtx.restore();
      }
    } else {
      if (pointsRef.current.length >= 2) {
        const p1 = pointsRef.current[pointsRef.current.length - 2];
        const p2 = pointsRef.current[pointsRef.current.length - 1];
        
        const midPoint = {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2
        };

        if (prevMidPointRef.current) {
          drawStrokeSegment(ctx, prevMidPointRef.current, midPoint, size);
        } else {
          drawStrokeSegment(ctx, p1, midPoint, size);
        }

        prevMidPointRef.current = midPoint;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingPan) {
      setIsDraggingPan(false);
      viewportRef.current?.releasePointerCapture(e.pointerId);
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    viewportRef.current?.releasePointerCapture(e.pointerId);

    if (activeTool === 'eyedropper') return;

    const canvas = document.getElementById(`layer-canvas-${activeLayerId}`) as HTMLCanvasElement;
    if (canvas && pointsRef.current.length > 0 && activeTool !== 'smudge') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const finalPoint = pointsRef.current[pointsRef.current.length - 1];
        const pScale = getPressureScale(e);
        const size = brushSize * (0.35 + pScale * 0.65);
        if (prevMidPointRef.current) {
          drawStrokeSegment(ctx, prevMidPointRef.current, finalPoint, size);
        }
      }
    }

    pointsRef.current = [];
    prevMidPointRef.current = null;
    smudgeCanvasRef.current = null;

    updateLayerThumbnail(activeLayerId);
  };

  // Stable Diffusion Prompt Layer Generation
  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isAIGenerating) return;

    setIsAIGenerating(true);
    setAiProgressMessage("Preloading stable diffusion neural models...");

    try {
      const parsedSeed = aiSeed ? parseInt(aiSeed) : undefined;
      
      setAiProgressMessage("Constructing prompt embeddings with CLIP model...");
      await new Promise(r => setTimeout(r, 600));

      setAiProgressMessage("Denoising neural latent steps (Stable Diffusion v1.5)...");
      
      const response = await generateAIImage({
        prompt: aiPrompt.trim(),
        negative_prompt: aiNegativePrompt.trim(),
        num_inference_steps: aiSteps,
        guidance_scale: aiCfgScale,
        seed: parsedSeed
      });

      setAiProgressMessage("Decoding latents back to image pixels via VAE...");
      await new Promise(r => setTimeout(r, 500));

      setAiProgressMessage("Importing generated AI art into layer stack...");

      pushUndo();
      const newId = `layer-${Date.now()}`;
      // Clean layer name
      const shortPrompt = aiPrompt.slice(0, 15).trim() || 'AI Painting';
      const newLayers = [
        ...layers,
        { id: newId, name: `AI: ${shortPrompt}...`, visible: true, opacity: 1.0, blendMode: 'normal', thumbnail: '' }
      ];
      setLayers(newLayers);
      setActiveLayerId(newId);

      setTimeout(() => {
        const canvas = document.getElementById(`layer-canvas-${newId}`) as HTMLCanvasElement;
        if (canvas) {
          const ctx = canvas.getContext('2d')!;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            updateLayerThumbnail(newId);
            setIsAIGenerating(false);
          };
          img.src = response.image_url;
        } else {
          setIsAIGenerating(false);
        }
      }, 100);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to generate AI layer.");
      setIsAIGenerating(false);
    }
  };

  // Layer stack operations
  const addLayer = () => {
    pushUndo();
    const newId = `layer-${Date.now()}`;
    const newName = `Layer ${layers.length}`;
    
    const newLayers = [
      ...layers, 
      { id: newId, name: newName, visible: true, opacity: 1.0, blendMode: 'normal', thumbnail: '' }
    ];
    setLayers(newLayers);
    setActiveLayerId(newId);

    setTimeout(() => updateLayerThumbnail(newId), 30);
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) {
      alert("At least one layer must remain!");
      return;
    }
    pushUndo();

    const filtered = layers.filter(l => l.id !== id);
    setLayers(filtered);

    if (activeLayerId === id) {
      setActiveLayerId(filtered[filtered.length - 1].id);
    }
  };

  const duplicateLayer = (id: string) => {
    pushUndo();
    const sourceCanvas = document.getElementById(`layer-canvas-${id}`) as HTMLCanvasElement;
    if (!sourceCanvas) return;

    const newId = `layer-${Date.now()}`;
    const original = layers.find(l => l.id === id)!;
    const newLayers = [...layers];
    const idx = layers.findIndex(l => l.id === id);

    newLayers.splice(idx + 1, 0, {
      id: newId,
      name: `${original.name} Copy`,
      visible: original.visible,
      opacity: original.opacity,
      blendMode: original.blendMode,
      thumbnail: original.thumbnail
    });

    setLayers(newLayers);
    setActiveLayerId(newId);

    setTimeout(() => {
      const destCanvas = document.getElementById(`layer-canvas-${newId}`) as HTMLCanvasElement;
      if (destCanvas) {
        const destCtx = destCanvas.getContext('2d')!;
        destCtx.drawImage(sourceCanvas, 0, 0);
        updateLayerThumbnail(newId);
      }
    }, 50);
  };

  const clearLayer = (id: string) => {
    pushUndo();
    const canvas = document.getElementById(`layer-canvas-${id}`) as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      if (id === 'layer-bg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
      
      updateLayerThumbnail(id);
    }
  };

  const mergeDown = (id: string) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx === 0) {
      alert("Cannot merge down the bottom-most layer!");
      return;
    }
    
    pushUndo();

    const targetLayer = layers[idx - 1];
    const sourceCanvas = document.getElementById(`layer-canvas-${id}`) as HTMLCanvasElement;
    const targetCanvas = document.getElementById(`layer-canvas-${targetLayer.id}`) as HTMLCanvasElement;

    if (sourceCanvas && targetCanvas) {
      const targetCtx = targetCanvas.getContext('2d')!;
      const sourceLayer = layers[idx];

      targetCtx.save();
      targetCtx.globalAlpha = sourceLayer.opacity;
      targetCtx.globalCompositeOperation = sourceLayer.blendMode === 'normal' ? 'source-over' : sourceLayer.blendMode as any;
      targetCtx.drawImage(sourceCanvas, 0, 0);
      targetCtx.restore();

      const newLayers = layers.filter(l => l.id !== id);
      setLayers(newLayers);
      setActiveLayerId(targetLayer.id);

      setTimeout(() => updateLayerThumbnail(targetLayer.id), 50);
    }
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    const idx = layers.findIndex(l => l.id === id);
    if (direction === 'up' && idx === layers.length - 1) return;
    if (direction === 'down' && idx === 0) return;

    pushUndo();
    const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
    const newLayers = [...layers];
    
    const temp = newLayers[idx];
    newLayers[idx] = newLayers[targetIdx];
    newLayers[targetIdx] = temp;

    setLayers(newLayers);
  };

  const toggleVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l));
  };

  const handleBlendModeChange = (id: string, blendMode: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, blendMode } : l));
  };

  const handleRenameSubmit = (id: string) => {
    if (renameValue.trim() !== '') {
      setLayers(prev => prev.map(l => l.id === id ? { ...l, name: renameValue } : l));
    }
    setRenamingLayerId(null);
  };

  // Merges visible layers for saving or posting
  const getCompositeCanvas = (): HTMLCanvasElement => {
    const composite = document.createElement('canvas');
    composite.width = canvasWidth;
    composite.height = canvasHeight;
    const ctx = composite.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    layers.forEach(l => {
      if (l.visible) {
        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.globalCompositeOperation = l.blendMode === 'normal' ? 'source-over' : l.blendMode as any;
        const layerCanvas = document.getElementById(`layer-canvas-${l.id}`) as HTMLCanvasElement;
        if (layerCanvas) {
          ctx.drawImage(layerCanvas, 0, 0);
        }
        ctx.restore();
      }
    });

    return composite;
  };

  // Exports
  const handleSaveImage = () => {
    const composite = getCompositeCanvas();
    const url = composite.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `masterpiece-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  const handleExportJSON = () => {
    const data = {
      width: canvasWidth,
      height: canvasHeight,
      layers: layers.map(l => {
        const canvas = document.getElementById(`layer-canvas-${l.id}`) as HTMLCanvasElement;
        const imageData = canvas ? canvas.toDataURL('image/png') : '';
        return {
          id: l.id,
          name: l.name,
          visible: l.visible,
          opacity: l.opacity,
          blendMode: l.blendMode,
          imageData
        };
      })
    };

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `layered-canvas-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.layers || !Array.isArray(data.layers)) {
          alert('Invalid canvas project JSON schema!');
          return;
        }

        pushUndo();

        const importedMetadata = data.layers.map((l: any) => ({
          id: l.id,
          name: l.name,
          visible: l.visible !== undefined ? l.visible : true,
          opacity: l.opacity !== undefined ? l.opacity : 1.0,
          blendMode: l.blendMode !== undefined ? l.blendMode : 'normal',
          thumbnail: ''
        }));

        setLayers(importedMetadata);
        if (importedMetadata.length > 0) {
          setActiveLayerId(importedMetadata[importedMetadata.length - 1].id);
        }

        setTimeout(() => {
          data.layers.forEach((l: any) => {
            const canvas = document.getElementById(`layer-canvas-${l.id}`) as HTMLCanvasElement;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                if (l.imageData) {
                  const img = new Image();
                  img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    updateLayerThumbnail(l.id);
                  };
                  img.src = l.imageData;
                }
              }
            }
          });
        }, 100);

      } catch (err) {
        alert('Failed parsing canvas JSON project file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // AI Enhancer: Post photo to /enhance and overlay it as a new canvas layer
  const handleEnhanceLayerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsEnhancing(true);
    setEnhanceProgressMessage("Sending image to OpenCV enhancement pipeline...");

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      setEnhanceProgressMessage("Correcting perspective warp & cropping painting bounds...");
      await new Promise(r => setTimeout(r, 800));
      
      setEnhanceProgressMessage("Applying bilateral denoising & sharpening filters...");
      await new Promise(r => setTimeout(r, 800));

      setEnhanceProgressMessage("Running CLAHE contrast boost & HSV saturation tuning...");

      const response = await fetch(`${API_BASE}/enhance/`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Enhancement failed' }));
        throw new Error(errorData.detail || `Server error ${response.status}`);
      }

      const data = await response.json();
      const enhancedUrl = data.enhanced_image_url;

      setEnhanceProgressMessage("Injecting upscaled AI layer into workspace...");

      pushUndo();
      
      const newId = `layer-${Date.now()}`;
      const newLayers = [
        ...layers,
        { id: newId, name: `Enhanced: ${file.name.split('.')[0].slice(0, 12)}`, visible: true, opacity: 1.0, blendMode: 'normal', thumbnail: '' }
      ];
      setLayers(newLayers);
      setActiveLayerId(newId);

      setTimeout(() => {
        const canvas = document.getElementById(`layer-canvas-${newId}`) as HTMLCanvasElement;
        if (canvas) {
          const ctx = canvas.getContext('2d')!;
          const img = new Image();
          img.crossOrigin = 'anonymous'; 
          img.onload = () => {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            updateLayerThumbnail(newId);
            setIsEnhancing(false);
          };
          img.onerror = () => {
            alert("Failed to render enhanced image buffer on canvas context.");
            setIsEnhancing(false);
          };
          img.src = enhancedUrl;
        } else {
          setIsEnhancing(false);
        }
      }, 100);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to process image enhancement.");
      setIsEnhancing(false);
    }

    e.target.value = '';
  };

  // Speedpaint Recording controls
  const handleToggleRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (!recorderCanvasRef.current) return;
      
      recordingChunksRef.current = [];
      try {
        const stream = recorderCanvasRef.current.captureStream(30); 
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordingChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `speedpaint-${Date.now()}.webm`;
          link.click();
          URL.revokeObjectURL(url);
          alert("Speedpaint video downloaded successfully!");
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start MediaRecorder:", err);
        alert("Speedpaint recording not supported in this browser format.");
      }
    }
  };

  // Publish to Feed
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishTitle.trim() || isPublishing) return;

    setIsPublishing(true);
    try {
      const composite = getCompositeCanvas();
      
      composite.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("Blob conversion failed");
        }
        const file = new File([blob], `canvas-${Date.now()}.png`, { type: 'image/png' });
        
        await createPost(
          publishTitle.trim(),
          publishDesc.trim() || 'Painted in Canvas Personal Studio.',
          file
        );
        
        setIsPublishing(false);
        setShowPublishModal(false);
        alert('Masterpiece successfully posted to feed!');
        navigate('/');
      }, 'image/png');

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error occurred while publishing.');
      setIsPublishing(false);
    }
  };

  // HSV Sat/Val Colorpicker Drag calculations
  const handleColorBoxInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!colorPickerSVBoxRef.current) return;
    const rect = colorPickerSVBoxRef.current.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    let x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const newSat = Math.round(x * 100);
    const newVal = Math.round((1 - y) * 100);

    setSat(newSat);
    setVal(newVal);
    updateHexFromHSV(hue, newSat, newVal);
  };

  // Swatches list
  const presetPalettes = [
    ['#2D2D2D', '#FAF9F6', '#A68A64', '#E63946', '#F1FAEE', '#A8DADC', '#457B9D', '#1D3557'],
    ['#FF0055', '#00FFCC', '#9900FF', '#FFFF00', '#FF9900', '#0099FF', '#FF00FF', '#11111d'],
    ['#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFC6FF', '#E8AEB7', '#D8E2DC']
  ];

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      <Navbar />

      {/* Hidden Speedpaint Recorder Canvas */}
      <canvas 
        ref={recorderCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="hidden"
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Floating Toolbar (Top Center) */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/80 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full flex items-center space-x-6 shadow-2xl">
          {/* Tool Modes */}
          <div className="flex items-center bg-zinc-950/60 p-1 rounded-full border border-white/5 space-x-1">
            <button 
              onClick={() => setActiveTool('brush')}
              className={`p-2 rounded-full transition-all ${activeTool === 'brush' ? 'bg-zinc-800 text-[#A68A64]' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Brush Tool (B)"
            >
              <Paintbrush className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTool('smudge')}
              className={`p-2 rounded-full transition-all ${activeTool === 'smudge' ? 'bg-zinc-800 text-[#A68A64]' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Smudge Tool (S)"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTool('eraser')}
              className={`p-2 rounded-full transition-all ${activeTool === 'eraser' ? 'bg-zinc-800 text-[#A68A64]' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Eraser Tool (E)"
            >
              <Eraser className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTool('eyedropper')}
              className={`p-2 rounded-full transition-all ${activeTool === 'eyedropper' ? 'bg-zinc-800 text-[#A68A64]' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Eyedropper Tool (I / Hold Alt)"
            >
              <Pipette className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTool('pan')}
              className={`p-2 rounded-full transition-all ${activeTool === 'pan' || isSpacePressed ? 'bg-zinc-800 text-[#A68A64]' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Pan Canvas (P / Space+Drag)"
            >
              <Hand className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Speedpaint video recording toggle */}
          <button
            onClick={handleToggleRecording}
            className={`p-2 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-950 text-red-500 border border-red-500/20' : 'hover:bg-zinc-800 text-zinc-400 hover:text-red-500'}`}
            title={isRecording ? "Stop Speedpaint Session" : "Record Speedpaint Session"}
          >
            {isRecording ? <VideoOff className="w-4 h-4 animate-pulse" /> : <Video className="w-4 h-4" />}
          </button>

          <div className="h-6 w-px bg-white/10" />

          {/* Undo/Redo stack actions */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleUndo} 
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button 
              onClick={handleRedo} 
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setZoom(prev => Math.max(0.1, prev - 0.15))}
              className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono w-12 text-center text-zinc-300">
              {Math.round(zoom * 100)}%
            </span>
            <button 
              onClick={() => setZoom(prev => Math.min(10, prev + 0.15))}
              className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={resetView}
              className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-[#A68A64] ml-1"
              title="Fit Canvas to View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Export / Share actions */}
          <div className="flex items-center space-x-3">
            <label className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 cursor-pointer transition-all flex items-center justify-center" title="Import Project (JSON)">
              <FileUp className="w-4 h-4" />
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportJSON} 
                className="hidden" 
              />
            </label>
            <button 
              onClick={handleExportJSON}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 transition-all"
              title="Export Layered Project (JSON)"
            >
              <FileDown className="w-4 h-4" />
            </button>
            <button 
              onClick={handleSaveImage}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 transition-all"
              title="Save Image (PNG)"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Publish button */}
            {isAuthenticated ? (
              <button 
                onClick={() => {
                  setPublishTitle(`Masterpiece #${Date.now().toString().slice(-4)}`);
                  setPublishDesc('');
                  setShowPublishModal(true);
                }}
                className="bg-[#A68A64] hover:bg-[#bda17a] text-zinc-950 font-bold px-4 py-1.5 rounded-full text-[10px] tracking-wider uppercase transition-all shadow-md flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Exhibit</span>
              </button>
            ) : (
              <button 
                onClick={() => navigate('/signin')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-1.5 rounded-full text-[10px] tracking-wider uppercase transition-all shadow-md flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Login to Exhibit</span>
              </button>
            )}
          </div>
        </div>

        {/* Viewport container for scrolling/panning */}
        <div 
          ref={viewportRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onMouseEnter={() => setIsHoveringCanvas(true)}
          onMouseLeave={() => setIsHoveringCanvas(false)}
          className={`flex-1 h-full overflow-hidden relative outline-none select-none bg-zinc-900 border-t border-white/5 ${
            activeTool === 'pan' || isSpacePressed
              ? isDraggingPan ? 'cursor-grabbing' : 'cursor-grab'
              : activeTool === 'eyedropper' ? 'cursor-copy' : 'cursor-crosshair'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* The Zoom/Pan Container of stacked canvases */}
          <div 
            ref={containerRef}
            className="absolute shadow-2xl select-none pointer-events-none rounded"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              backgroundImage: 'linear-gradient(45deg, #f4f4f5 25%, transparent 25%), linear-gradient(-45deg, #f4f4f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f4f4f5 75%), linear-gradient(-45deg, transparent 75%, #f4f4f5 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              backgroundColor: '#ffffff',
              border: '1px solid #d4d4d8'
            }}
          >
            {/* Stacked canvases mapped in visual layers stacking order */}
            {layers.map((layer, index) => (
              <canvas 
                key={layer.id}
                id={`layer-canvas-${layer.id}`}
                width={canvasWidth}
                height={canvasHeight}
                className="absolute top-0 left-0 w-full h-full select-none"
                style={{
                  zIndex: index, // Stacking order
                  opacity: layer.opacity,
                  visibility: layer.visible ? 'visible' : 'hidden',
                  mixBlendMode: layer.blendMode as any // NATIVE GPU CSS MIX BLEND MODES
                }}
              />
            ))}
          </div>

          {/* Floating Brush Cursor Circular Outline (follows cursor) */}
          {isHoveringCanvas && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'smudge') && !isSpacePressed && (
            <div 
              className="absolute pointer-events-none rounded-full border border-white/60 bg-black/10 mix-blend-difference z-50 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
                width: `${brushSize * zoom}px`,
                height: `${brushSize * zoom}px`,
              }}
            />
          )}
        </div>

        {/* LEFT FLOATING PANEL: Studio Controls (Canvas Tools vs AI Generation) */}
        <div className="absolute left-6 top-24 bottom-6 w-72 z-30 flex flex-col space-y-6 pointer-events-none">
          
          <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-[32px] p-6 flex flex-col pointer-events-auto shadow-2xl space-y-6">
            
            {/* Panel Tab Selectors */}
            <div className="flex border-b border-white/10 pb-3">
              <button 
                onClick={() => setActiveLeftTab('paint')}
                className={`flex-1 pb-1 text-xs font-bold uppercase tracking-wider transition-colors text-center ${activeLeftTab === 'paint' ? 'text-[#A68A64] border-b-2 border-[#A68A64]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Canvas
              </button>
              <button 
                onClick={() => setActiveLeftTab('ai')}
                className={`flex-1 pb-1 text-xs font-bold uppercase tracking-wider transition-colors text-center ${activeLeftTab === 'ai' ? 'text-[#A68A64] border-b-2 border-[#A68A64]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Neural Gen
              </button>
            </div>

            {activeLeftTab === 'paint' ? (
              // TAB 1: MANUAL DRAWING TOOLS
              <div className="space-y-6">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#A68A64] block mb-1">Brush Engine</span>
                  <h2 className="font-serif text-lg italic font-semibold leading-tight">Presets & Dynamics</h2>
                </div>

                {/* Brush Type presets */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-1.5 rounded-2xl border border-white/5">
                  <button 
                    onClick={() => setBrushType('pen')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${brushType === 'pen' ? 'bg-zinc-800 text-[#A68A64]' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-current" />
                    <span>Classic Pen</span>
                  </button>
                  <button 
                    onClick={() => setBrushType('airbrush')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${brushType === 'airbrush' ? 'bg-zinc-800 text-[#A68A64]' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-current blur-[1px]" />
                    <span>Airbrush</span>
                  </button>
                  <button 
                    onClick={() => setBrushType('pencil')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${brushType === 'pencil' ? 'bg-zinc-800 text-[#A68A64]' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    <span className="font-mono text-[9px] border border-current px-0.5 rounded leading-none">#</span>
                    <span>Pencil</span>
                  </button>
                  <button 
                    onClick={() => setBrushType('calligraphy')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${brushType === 'calligraphy' ? 'bg-zinc-800 text-[#A68A64]' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    <div className="w-3.5 h-1 bg-current rotate-45" />
                    <span>Calligraphy</span>
                  </button>
                </div>

                {/* Slider 1: Brush Size */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Brush Size</span>
                    <span className="font-mono">{brushSize}px</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full accent-[#A68A64] bg-zinc-950/60 rounded-full h-1.5 appearance-none cursor-pointer"
                  />
                </div>

                {/* Slider 2: Brush Opacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Brush Opacity</span>
                    <span className="font-mono">{brushOpacity}%</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="100"
                    value={brushOpacity}
                    onChange={(e) => setBrushOpacity(parseInt(e.target.value))}
                    className="w-full accent-[#A68A64] bg-zinc-950/60 rounded-full h-1.5 appearance-none cursor-pointer"
                  />
                </div>

                {/* Slider 3: Streamline (Stabilizer) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Stabilizer (Streamline)</span>
                    <span className="font-mono">{Math.round(streamline * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={streamline * 100}
                    onChange={(e) => setStreamline(parseInt(e.target.value) / 100)}
                    className="w-full accent-[#A68A64] bg-zinc-950/60 rounded-full h-1.5 appearance-none cursor-pointer"
                  />
                  <p className="text-[8px] opacity-40 leading-none">Filters jitters. Tablet stylus pressure scales size automatically.</p>
                </div>
              </div>
            ) : (
              // TAB 2: NEURAL GEN (STABLE DIFFUSION LAYER SYNTHESIZER)
              <form onSubmit={handleAIGenerate} className="space-y-5">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#A68A64] block mb-1">Neural Diffusion</span>
                  <h2 className="font-serif text-lg italic font-semibold leading-tight">Generate Layer</h2>
                </div>

                {/* Prompt input */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Artwork prompt</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe what to paint..."
                    rows={3}
                    required
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#A68A64] resize-none font-medium placeholder:text-zinc-600"
                  />
                </div>

                {/* Advanced parameters toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedAI(!showAdvancedAI)}
                  className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#A68A64] hover:opacity-85"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{showAdvancedAI ? "Hide" : "Show"} Settings</span>
                </button>

                {showAdvancedAI && (
                  <div className="space-y-4 p-3 bg-zinc-950/60 border border-white/5 rounded-2xl">
                    {/* Negative prompt */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Negative Prompt</label>
                      <input 
                        type="text"
                        value={aiNegativePrompt}
                        onChange={(e) => setAiNegativePrompt(e.target.value)}
                        placeholder="e.g. lowres, blur, text"
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-zinc-300 focus:outline-none"
                      />
                    </div>

                    {/* Inference Steps */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                        <span>Steps: {aiSteps}</span>
                      </div>
                      <input 
                        type="range"
                        min="5"
                        max="50"
                        value={aiSteps}
                        onChange={(e) => setAiSteps(parseInt(e.target.value))}
                        className="w-full accent-[#A68A64] h-1"
                      />
                    </div>

                    {/* Guidance Scale */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                        <span>CFG Scale: {aiCfgScale}</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={aiCfgScale}
                        onChange={(e) => setAiCfgScale(parseFloat(e.target.value))}
                        className="w-full accent-[#A68A64] h-1"
                      />
                    </div>

                    {/* Custom Seed */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Seed (Optional)</label>
                      <input 
                        type="number"
                        value={aiSeed}
                        onChange={(e) => setAiSeed(e.target.value)}
                        placeholder="Random seed"
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-zinc-300 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAIGenerating || !aiPrompt.trim()}
                  className="w-full py-3 bg-[#A68A64] hover:bg-[#bda17a] disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold rounded-full text-[10px] tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkle className="w-3.5 h-3.5 fill-current" />
                  <span>Synthesize Layer</span>
                </button>
              </form>
            )}
          </div>

          {/* Panel 2: Interactive Color picker */}
          {activeLeftTab === 'paint' && (
            <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-[32px] p-6 flex flex-col pointer-events-auto shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#A68A64] block mb-1">Color Palette</span>
                  <h3 className="font-serif text-lg italic font-semibold">Hue & Saturation</h3>
                </div>
                <button 
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showColorPicker ? '' : '-rotate-90'}`} />
                </button>
              </div>

              {showColorPicker && (
                <div className="space-y-4">
                  {/* 2D SV Box */}
                  <div 
                    ref={colorPickerSVBoxRef}
                    onMouseDown={handleColorBoxInteraction}
                    onTouchStart={handleColorBoxInteraction}
                    onMouseMove={(e) => {
                      if (e.buttons === 1) handleColorBoxInteraction(e);
                    }}
                    onTouchMove={(e) => {
                      handleColorBoxInteraction(e);
                    }}
                    className="relative h-28 w-full rounded-2xl cursor-crosshair overflow-hidden border border-white/10 select-none"
                    style={{
                      backgroundColor: `hsl(${hue}, 100%, 50%)`,
                      touchAction: 'none'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                    
                    {/* Target SV indicator dot */}
                    <div 
                      className="absolute w-3 h-3 rounded-full border border-white bg-black/25 -translate-x-1/2 translate-y-1/2 shadow shadow-black"
                      style={{
                        left: `${sat}%`,
                        bottom: `${val}%`
                      }}
                    />
                  </div>

                  {/* Hue Slider (0-360) */}
                  <div className="space-y-1">
                    <input 
                      type="range"
                      min="0"
                      max="360"
                      value={hue}
                      onChange={(e) => {
                        const newHue = parseInt(e.target.value);
                        setHue(newHue);
                        updateHexFromHSV(newHue, sat, val);
                      }}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer border border-white/5"
                      style={{
                        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                      }}
                    />
                  </div>

                  {/* Hex display */}
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-full border border-white/20 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: activeColor }}
                    />
                    <input 
                      type="text"
                      value={activeColor.toUpperCase()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                          setActiveColor(val);
                          const r = parseInt(val.slice(1, 3), 16);
                          const g = parseInt(val.slice(3, 5), 16);
                          const b = parseInt(val.slice(5, 7), 16);
                          const [h, s, v] = rgbToHSV(r, g, b);
                          setHue(h);
                          setSat(s);
                          setVal(v);
                        } else {
                          setActiveColor(val);
                        }
                      }}
                      className="flex-1 bg-zinc-950/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-[#A68A64]"
                      maxLength={7}
                    />
                  </div>

                  {/* Presets and Swatches */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Preset Swatches</span>
                    
                    <div className="flex flex-col space-y-1.5">
                      {presetPalettes.map((palette, pIdx) => (
                        <div key={pIdx} className="flex justify-between">
                          {palette.map((color, cIdx) => (
                            <button 
                              key={cIdx}
                              onClick={() => {
                                setActiveColor(color);
                                const r = parseInt(color.slice(1, 3), 16);
                                const g = parseInt(color.slice(3, 5), 16);
                                const b = parseInt(color.slice(5, 7), 16);
                                const [h, s, v] = rgbToHSV(r, g, b);
                                setHue(h);
                                setSat(s);
                                setVal(v);
                              }}
                              className={`w-5 h-5 rounded-full border border-white/10 active:scale-90 transition-all ${activeColor.toLowerCase() === color.toLowerCase() ? 'ring-1 ring-offset-1 ring-[#A68A64]' : ''}`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT FLOATING PANEL: Layers Management */}
        <div className="absolute right-6 top-24 bottom-6 w-80 z-30 pointer-events-none">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-[32px] p-6 h-full flex flex-col pointer-events-auto shadow-2xl">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#A68A64] block mb-1">Layer Stack</span>
                <h2 className="font-serif text-xl italic font-semibold">Art Board</h2>
              </div>
              <div className="flex items-center space-x-2">
                {/* AI Enhance trigger */}
                <button
                  onClick={() => enhanceFileInputRef.current?.click()}
                  className="bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-[#A68A64] border border-white/10 p-2 rounded-full transition-all flex items-center justify-center"
                  title="AI Enhance Painting (perspective, denoise, CLAHE, super-res)"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <input 
                  type="file"
                  ref={enhanceFileInputRef}
                  onChange={handleEnhanceLayerUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Add Layer */}
                <button 
                  onClick={addLayer}
                  className="bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-[#A68A64] border border-white/10 p-2 rounded-full transition-all flex items-center justify-center"
                  title="Add New Layer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Layer List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {[...layers].reverse().map((layer) => {
                const isSelected = activeLayerId === layer.id;
                const layerIdx = layers.findIndex(l => l.id === layer.id);

                return (
                  <div 
                    key={layer.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'bg-zinc-800/80 border-[#A68A64] shadow-md shadow-[#A68A64]/5' 
                        : 'bg-zinc-950/40 border-white/5 hover:bg-zinc-900/50 hover:border-white/10'
                    }`}
                  >
                    {/* Top Row: Thumbnail + Title + Visibility */}
                    <div className="flex items-center space-x-3">
                      {/* Thumbnail container */}
                      <button 
                        onClick={() => setActiveLayerId(layer.id)}
                        className="w-12 h-12 rounded-lg bg-zinc-950 border border-white/10 overflow-hidden flex-shrink-0 relative flex items-center justify-center shadow-inner"
                        style={{
                          backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
                          backgroundSize: '10px 10px',
                          backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                          backgroundColor: '#000'
                        }}
                      >
                        {layer.thumbnail ? (
                          <img src={layer.thumbnail} alt={layer.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full opacity-10 bg-white" />
                        )}
                      </button>

                      {/* Title & Rename input */}
                      <div className="flex-1 min-w-0">
                        {renamingLayerId === layer.id ? (
                          <input 
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameSubmit(layer.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSubmit(layer.id);
                              if (e.key === 'Escape') setRenamingLayerId(null);
                            }}
                            autoFocus
                            className="bg-zinc-950 px-2 py-0.5 border border-[#A68A64] text-xs font-semibold rounded w-full text-zinc-100 focus:outline-none"
                          />
                        ) : (
                          <div 
                            onDoubleClick={() => {
                              setRenamingLayerId(layer.id);
                              setRenameValue(layer.name);
                            }}
                            onClick={() => setActiveLayerId(layer.id)}
                            className="text-xs font-semibold truncate cursor-pointer hover:text-[#A68A64] transition-colors"
                            title="Double click to rename"
                          >
                            {layer.name}
                          </div>
                        )}
                        <span className="text-[8px] opacity-40 uppercase tracking-widest font-bold">
                          {layer.id === 'layer-bg' ? 'Base Layer' : `Layer Index ${layerIdx}`}
                        </span>
                      </div>

                      {/* Visibility toggle */}
                      <button 
                        onClick={() => toggleVisibility(layer.id)}
                        className={`p-1.5 rounded-full hover:bg-zinc-800 transition-colors ${layer.visible ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
                      >
                        {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Middle Row: Blend Modes (Photoshop-like Layer Mixing) */}
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Blend Mode</span>
                      <select 
                        value={layer.blendMode}
                        onChange={(e) => handleBlendModeChange(layer.id, e.target.value)}
                        className="bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 focus:outline-none focus:border-[#A68A64] cursor-pointer"
                      >
                        <option value="normal">Normal</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                        <option value="darken">Darken</option>
                        <option value="lighten">Lighten</option>
                        <option value="color-dodge">Color Dodge</option>
                        <option value="color-burn">Color Burn</option>
                        <option value="difference">Difference</option>
                      </select>
                    </div>

                    {/* Bottom Row: Opacity Slider and Metadata actions */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-3">
                      <div className="flex-1 flex items-center space-x-2">
                        <span className="text-[8px] font-mono text-zinc-500 w-6">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={layer.opacity * 100}
                          onChange={(e) => handleOpacityChange(layer.id, parseInt(e.target.value) / 100)}
                          className="flex-1 accent-[#A68A64] bg-zinc-950/60 rounded-full h-1 appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button 
                          onClick={() => moveLayer(layer.id, 'up')}
                          disabled={layerIdx === layers.length - 1}
                          className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-all"
                          title="Move Layer Up"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => moveLayer(layer.id, 'down')}
                          disabled={layerIdx === 0}
                          className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-all"
                          title="Move Layer Down"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => duplicateLayer(layer.id)}
                          className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-all"
                          title="Duplicate Layer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {layerIdx > 0 && (
                          <button 
                            onClick={() => mergeDown(layer.id)}
                            className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-[#A68A64] transition-all"
                            title="Merge Layer Down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        )}
                        <button 
                          onClick={() => clearLayer(layer.id)}
                          className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-all"
                          title="Clear Layer Canvas"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                        {layers.length > 1 && (
                          <button 
                            onClick={() => deleteLayer(layer.id)}
                            className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-red-500 transition-all"
                            title="Delete Layer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Tips */}
            <div className="mt-6 p-4 bg-zinc-950/60 border border-white/5 rounded-2xl text-[9px] text-zinc-400 leading-relaxed font-medium">
              <span className="text-[#A68A64] font-bold block mb-1">Advanced Shortcuts:</span>
              • <strong className="text-zinc-300">B</strong>: Brush • <strong className="text-zinc-300">S</strong>: Smudge Tool<br />
              • <strong className="text-zinc-300">E</strong>: Eraser • <strong className="text-zinc-300">I</strong>: Eyedropper<br />
              • <strong className="text-zinc-300">Space + Drag</strong>: Pan workspace<br />
              • <strong className="text-zinc-300">Sparkles</strong>: OpenCV photo enhancer<br />
              • Double click layer title to rename.
            </div>
          </div>
        </div>

      </div>

      {/* GLOBAL GLASSMORPHIC LOADING SCREEN FOR AI ENHANCER */}
      {isEnhancing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-white/10 rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 mx-auto rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center relative">
              <Loader2 className="w-8 h-8 text-[#A68A64] animate-spin" />
              <Sparkles className="w-4 h-4 text-white absolute top-2 right-2 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-serif text-2xl italic font-semibold">AI Enhancement Pipeline</h3>
              <p className="text-sm text-zinc-300 font-medium">
                {enhanceProgressMessage}
              </p>
            </div>
            
            <div className="text-[10px] font-bold text-[#A68A64] uppercase tracking-widest animate-pulse">
              OpenCV is polishing pixels...
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL GLASSMORPHIC LOADING SCREEN FOR AI IMAGE LAYER GENERATOR */}
      {isAIGenerating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-white/10 rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 mx-auto rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center relative">
              <Loader2 className="w-8 h-8 text-[#A68A64] animate-spin" />
              <Sparkle className="w-5 h-5 text-white absolute top-2 right-2 animate-pulse fill-current" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-serif text-2xl italic font-semibold">Synthesizing AI Artwork Layer</h3>
              <p className="text-sm text-zinc-300 font-medium">
                {aiProgressMessage}
              </p>
            </div>
            
            <div className="text-[10px] font-bold text-[#A68A64] uppercase tracking-widest animate-pulse">
              Stable Diffusion is painting details...
            </div>
          </div>
        </div>
      )}

      {/* EXHIBIT/PUBLISH TO FEED MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-[32px] max-w-md w-full p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#A68A64] block mb-1">Exhibition Curation</span>
                <h3 className="font-serif text-2xl italic font-semibold">Publish Masterpiece</h3>
              </div>
              <button 
                onClick={() => setShowPublishModal(false)}
                className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Artwork Title</label>
                <input 
                  type="text"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="e.g. Sunset in Crimson"
                  required
                  disabled={isPublishing}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#A68A64]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description</label>
                <textarea 
                  value={publishDesc}
                  onChange={(e) => setPublishDesc(e.target.value)}
                  placeholder="e.g. Exploring color gradients and stroke textures..."
                  rows={3}
                  disabled={isPublishing}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#A68A64] resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  disabled={isPublishing}
                  className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 border border-white/10 text-zinc-300 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isPublishing}
                  className="flex-1 py-3 bg-[#A68A64] hover:bg-[#bda17a] text-zinc-950 rounded-full text-xs font-bold uppercase tracking-widest transition-all font-bold shadow flex items-center justify-center gap-2"
                >
                  {isPublishing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Exhibiting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>Publish Now</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- TECHNICAL COLOR PICKER CONVERSION MATHEMATICS ---

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function rgbToHSV(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [
    Math.round(h * 360),
    Math.round(s * 100),
    Math.round(v * 100)
  ];
}

function hsvToHex(h: number, s: number, v: number): string {
  h /= 360;
  s /= 100;
  v /= 100;
  
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return '#' + toHex(r) + toHex(g) + toHex(b);
}
