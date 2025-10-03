import cv2
from pyzbar.pyzbar import decode
import time
import json
import os
import subprocess
import pygame
from supabase import create_client, Client

# --- Supabase 設定 ---
url: str = "https://bujcyjitngtgpkabcqtk.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1amN5aml0bmd0Z3BrYWJjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3ODkxMjEsImV4cCI6MjA1MzM2NTEyMX0.c91kNm19NhRFkLI6zgtEz9qD0CVM0E6v-g3DxZGOZNE"
supabase: Client = create_client(url, key)
WasteCategories = "燃えるゴミ"

# --- 起動時にゴミ箱を選択 ---
def select_trash_bin():
    result = supabase.table("trash_bins").select("name").execute()
    bins = [row["name"] for row in result.data]
    if not bins:
        print("[!] trash_bins が存在しません")
        exit()
    print("利用可能なゴミ箱:")
    for i, name in enumerate(bins, 1):
        print(f"{i}. {name}")
    choice = int(input("選択するゴミ箱番号を入力してください: "))
    if choice < 1 or choice > len(bins):
        print("[!] 無効な番号です")
        exit()
    return bins[choice - 1]
selected_bin_name = select_trash_bin()
print(f"[+] 選択したゴミ箱: {selected_bin_name}")

# --- ポイント更新 & trash_bins amount 更新 ---
def update_point(user_id: str):
    result = supabase.table("trash_bins").select("amount, capacity").eq("name", selected_bin_name).execute()
    if not result.data:
        print(f"[!] trash_bins.name={selected_bin_name} が見つかりません")
        return
    row = result.data[0]
    amount = row["amount"]
    capacity = row["capacity"]
    multiplier = 2 if (amount / capacity) <= 0.5 else 1
    result = supabase.table("profiles").select("points").eq("id", user_id).execute()
    rows = result.data

    if not rows:
        print(f"[!] profiles.id={user_id} が見つかりません")
        return
    current_points = rows[0].get("points", 0)
    new_points = current_points + multiplier
    supabase.table("profiles").update({"points": new_points}).eq("id", user_id).execute()
    print(f"[+] id={user_id} の points を {current_points} → {new_points} に更新しました (加算: {multiplier})")
    new_amount = amount + 1
    supabase.table("trash_bins").update({"amount": new_amount}).eq("name", selected_bin_name).execute()
    print(f"[+] ゴミ箱 '{selected_bin_name}' の amount を {amount} → {new_amount} に更新しました")

# --- QRコード解析 ---
def extract_user_id_from_qr(qr_data: str):
    try:
        data = json.loads(qr_data)
    except json.JSONDecodeError:
        return qr_data, None, None

    if isinstance(data, dict):
        return (
            data.get("userId"),
            data.get("wasteCategories"),
            data.get("orderNumber"),
        )

    elif isinstance(data, (int, str)):
        return data, None, None
    else:
        return None, None, None

# --- QR使用済みチェック ---
def is_qr_used(order_number: str) -> bool:
    result = supabase.table("orders").select("used, order_number").eq("order_number", order_number).execute()
    rows = result.data
    if not rows:
        print(f"[!] order_number={order_number} が orders に存在しません")
        return True
    return rows[0]["used"]

def mark_qr_used(order_number: str):
    supabase.table("orders").update({"used": True}).eq("order_number", order_number).execute()
    print(f"[+] QRコードを使用済みにしました: {order_number}")

# --- サウンド再生 ---
def play_sound():
    subprocess.run(["amixer", "set", "Master", "100%"])
    pygame.mixer.init()
    sound_path = os.path.join(os.path.dirname(__file__), "sound", "pinpon.mp3")
    if not os.path.exists(sound_path):
        print(f"[!] サウンドファイルが存在しません: {sound_path}")
        return
    pygame.mixer.music.load(sound_path)
    pygame.mixer.music.play()

# --- サウンド再生（バツ音） ---
def play_error_sound():
    subprocess.run(["amixer", "set", "Master", "100%"])
    pygame.mixer.init()
    sound_path = os.path.join(os.path.dirname(__file__), "sound", "Quiz-Buzzer05-1(Mid).mp3")
    if not os.path.exists(sound_path):
        print(f"[!] サウンドファイルが存在しません: {sound_path}")
        return
    pygame.mixer.music.load(sound_path)
    pygame.mixer.music.play() 

# --- ゴミカテゴリチェック ---
def waste_match(qr_category, camera_category):
    if isinstance(qr_category, list):
        return camera_category in qr_category
    elif isinstance(qr_category, str):
        return qr_category.strip() == camera_category.strip()
    else:
        return False

# --- カメラ起動 ---
cap = cv2.VideoCapture(0)
time.sleep(2)

if not cap.isOpened():
    print("カメラが読み込めませんでした")
    exit()
print("[+] カメラ起動完了。QRコードをスキャンしてください。")

while True:
    ret, frame = cap.read()
    if not ret:
        break
    decoded_objects = decode(frame)
    for obj in decoded_objects:
        qr_data = obj.data.decode("utf-8")
        user_id, WasteCategories_qr, order_number = extract_user_id_from_qr(qr_data)
        if not user_id or not order_number:
            print("[!] QRコードのJSONに必要な情報がありません")
            continue

        if not waste_match(WasteCategories_qr, WasteCategories):
            print(f"[!] ゴミカテゴリが一致しません: QR={WasteCategories_qr} カメラ={WasteCategories}")
            play_error_sound()
            continue

        if is_qr_used(order_number):
            print(f"[!] 使用済みQRコードを無視: {order_number}")
            continue

        print("QRコード検出:", qr_data)
        update_point(user_id)
        mark_qr_used(order_number)
        play_sound()
    time.sleep(0.1)
cap.release()
