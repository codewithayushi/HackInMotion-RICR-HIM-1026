import os
from PIL import Image, ImageDraw, ImageFont

def create_architecture_diagram():
    width = 1600
    height = 900
    bg_color = (248, 250, 252) # Slate 50
    
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype("arial.ttf", 34)
        font_subtitle = ImageFont.truetype("arial.ttf", 18)
        font_section = ImageFont.truetype("arial.ttf", 20)
        font_box_title = ImageFont.truetype("arial.ttf", 16)
        font_box_desc = ImageFont.truetype("arial.ttf", 13)
        font_tag = ImageFont.truetype("arial.ttf", 12)
    except:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_section = ImageFont.load_default()
        font_box_title = ImageFont.load_default()
        font_box_desc = ImageFont.load_default()
        font_tag = ImageFont.load_default()

    # Header Banner
    draw.rectangle([(0, 0), (width, 100)], fill=(30, 41, 59)) # Slate 800
    draw.text((50, 22), "Smart City Issue Reporting & Resolution Platform", fill=(255, 255, 255), font=font_title)
    draw.text((50, 64), "System Architecture & End-to-End Workflow Pipeline — RICR-HIM-1026", fill=(148, 163, 184), font=font_subtitle)

    # 4 Vertical Columns / Layers
    columns = [
        {
            "title": "1. CLIENT LAYER (React 18 SPA)",
            "color": (219, 234, 254), # Blue 100
            "border": (59, 130, 246), # Blue 500
            "x": 60, "w": 330,
            "boxes": [
                ("👤 Citizen Portal", "• Map Location Pinning (Leaflet)\n• Image Upload & Base64 Preview\n• Real-Time Issue Status Tracking\n• Community Upvoting & Reopen", (37, 99, 235)),
                ("🏢 Municipal Admin Dashboard", "• Department Queue Management\n• Status Resolution Workflow\n• Proof Photo & Resolution Notes\n• Dynamic KPIs & Hotspot Analytics", (30, 64, 175)),
                ("🗺️ Interactive GIS Engine", "• OpenStreetMap + Nominatim API\n• Reverse Geocoding Lookup\n• Incident Marker Clustering", (2, 132, 199))
            ]
        },
        {
            "title": "2. API & SECURITY GATEWAY",
            "color": (254, 243, 199), # Amber 100
            "border": (245, 158, 11), # Amber 500
            "x": 430, "w": 340,
            "boxes": [
                ("🛡️ Authentication & RBAC", "• JWT Token Verification\n• Role Isolation (Citizen vs Admin)\n• 6-Digit Email/SMS OTP Engine\n• Bcrypt Salted Password Hashing", (180, 83, 9)),
                ("⚡ Express Serverless Gateway", "• Vercel Serverless Function Engine\n• Helmet Security Headers & CORS\n• Rate Limiting & Input Sanitization\n• Unified Route Dispatcher", (217, 119, 6)),
                ("📡 Geocoding Proxy", "• OSM Nominatim & Esri Fallback\n• Debounced Address Autocomplete\n• Lat/Lng Bounds Validation", (161, 98, 7))
            ]
        },
        {
            "title": "3. BUSINESS LOGIC & AI SERVICES",
            "color": (220, 252, 231), # Green 100
            "border": (16, 185, 129), # Green 500
            "x": 810, "w": 340,
            "boxes": [
                ("🔍 Haversine Duplicate Engine", "• Spatial Proximity Radius (<500m)\n• Text Token Similarity Matching\n• Duplicate Flagging & Linking", (5, 150, 105)),
                ("🎯 Auto-Department Router", "• Category & Keyword Extensibility\n• Roads, Sanitation, Water, Power\n• Automated Triage & Priority Calc", (4, 120, 87)),
                ("⏱️ SLA & Escalation Engine", "• Priority-Based SLA Timers\n• Resolution Performance Metrics\n• Audit History & Lifecycle Log", (15, 118, 110))
            ]
        },
        {
            "title": "4. DATA & PERSISTENCE LAYER",
            "color": (243, 232, 255), # Purple 100
            "border": (168, 85, 247), # Purple 500
            "x": 1190, "w": 340,
            "boxes": [
                ("🗄️ Relational Database (ORM)", "• Sequelize ORM Layer\n• SQLite3 (Serverless / Development)\n• MySQL2 (Production Deployment)\n• User, Issue, StatusHistory, Upvote", (126, 34, 206)),
                ("📸 Evidence & Storage Store", "• Base64 Payload Transporter\n• Local File System & S3/Cloudinary\n• Resolution Proof Media Archive", (107, 33, 168)),
                ("📊 Real-Time Analytics Store", "• Dynamic DB Metric Calculation\n• Average Resolution Days\n• Department Performance Scores", (88, 28, 135))
            ]
        }
    ]

    for col in columns:
        cx, cy, cw, ch = col["x"], 130, col["w"], 720
        # Column background card
        draw.rounded_rectangle([(cx, cy), (cx + cw, cy + ch)], radius=16, fill=(255, 255, 255), outline=(226, 232, 240), width=2)
        # Column Header pill
        draw.rounded_rectangle([(cx + 10, cy + 12), (cx + cw - 10, cy + 52)], radius=10, fill=col["color"], outline=col["border"], width=1)
        draw.text((cx + 20, cy + 22), col["title"], fill=(15, 23, 42), font=font_section)

        # Draw boxes inside column
        by = cy + 70
        for b_title, b_desc, b_color in col["boxes"]:
            bh = 195
            draw.rounded_rectangle([(cx + 15, by), (cx + cw - 15, by + bh)], radius=12, fill=(248, 250, 252), outline=col["border"], width=2)
            
            # Box Title banner
            draw.rounded_rectangle([(cx + 15, by), (cx + cw - 15, by + 36)], radius=10, fill=b_color)
            draw.text((cx + 25, by + 9), b_title, fill=(255, 255, 255), font=font_box_title)

            # Box content
            draw.text((cx + 25, by + 48), b_desc, fill=(51, 65, 85), font=font_box_desc, spacing=8)
            by += bh + 20

    # Connector arrows between columns
    for arrow_x in [395, 775, 1155]:
        draw.polygon([(arrow_x + 5, 480), (arrow_x + 25, 490), (arrow_x + 5, 500)], fill=(71, 85, 105))
        draw.line([(arrow_x - 5, 490), (arrow_x + 15, 490)], fill=(71, 85, 105), width=3)

    # Footer Info
    draw.rectangle([(0, height - 35), (width, height)], fill=(15, 23, 42))
    draw.text((width // 2 - 200, height - 25), "HackInMotion 2026 • Team RICR-HIM-1026 • Author: Ayushi Pawar", fill=(148, 163, 184), font=font_tag)

    output_path = os.path.join(os.path.dirname(__file__), "..", "architecture-diagram.png")
    output_path = os.path.abspath(output_path)
    img.save(output_path, "PNG", quality=95)
    print(f"Architecture diagram successfully generated at: {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    create_architecture_diagram()
