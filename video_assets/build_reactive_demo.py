import asyncio, json, math, os, pathlib, re, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import edge_tts

ROOT=pathlib.Path(__file__).resolve().parent
SPEAKER="en-GB-RyanNeural"
W,H=1920,1080
LIGHT=(239,248,255);MUTED=(158,182,205);CYAN=(80,226,214);GREEN=(104,245,172)
FONT_DIR=pathlib.Path(r"C:\Windows\Fonts")
def font(size,bold=False):
 for n in (["segoeuib.ttf","arialbd.ttf","bahnschrift.ttf"] if bold else ["segoeui.ttf","arial.ttf"]):
  p=FONT_DIR/n
  if p.exists(): return ImageFont.truetype(str(p),size=size)
 return ImageFont.load_default()

SCENES=[
dict(name="00-intro",title="ONE EVENT. TWO CHAINS. ONE RESULT.",subtitle="Original live proof • Reactive Omni Buildathon 2026",
 image="01-source_genuine.png",badge="SET IT AND FORGET IT",metric="CHECKPOINT #4",
 note="A genuine Ethereum Sepolia event triggered a Reactive Lasna contract and a confirmed callback to Ethereum Sepolia.",
 narration="What happens if one blockchain event can trigger useful work on another chain, without a human clicking through each step? This is LDN Reactive Omni Quest Guardian. An original accessibility focused checkpoint automation experiment, built for the Reactive Omni Buildathon. Here is the real end to end test, with public source code and verified testnet transactions."),
dict(name="01-code",title="THE CONTRACTS DO THE WORK",subtitle="Open source • Solidity 0.8.29 • Reactive Omni V2",
 image="02-v2-contract_genuine.png",badge="OPEN SOURCE",metric="3 CONTRACTS",
 note="Origin announces; Reactive Guardian observes and requests a callback; Destination verifies and records it.",
 narration="The design uses three original Solidity contracts. Quest Origin publishes a timestamped checkpoint. The Guardian subscribes to that event on Reactive Lasna and asks the system to call the destination. Finally, Quest Destination authenticates the callback proxy and the Reactive sender, then prevents duplicate completion. The corrected version includes the official payer interface and a larger callback gas allowance."),
dict(name="02-origin",title="STEP 1 — SOURCE EVENT",subtitle="Ethereum Sepolia • Real transaction • Block 12,189,751",
 image="03-origin_genuine.png",badge="SOURCE NETWORK",metric="CHECKPOINT #4",
 note="Etherscan/Blockscout proof: 0xa9c3b35da1ca…e0bea2. The origin emitted CheckpointAnnounced.",
 narration="Here is the real source event. On Ethereum Sepolia, Quest Origin announced checkpoint number four. The transaction beginning a nine c three b three five was mined successfully in block twelve million, one hundred eighty nine thousand, seven hundred fifty one. This is not a mock event. The transaction and its logs are independently visible on public blockchain explorers."),
dict(name="03-lasna",title="STEP 2 — REACTIVE PROCESSING",subtitle="Reactive Lasna • Real system transaction • Block 8,985,935",
 image="04-guardian_genuine.png",badge="AUTOMATED REACTION",metric="CALLBACK REQUESTED",
 note="Reactscan proof: 0xdd2e4ad17447…7ff8515. Guardian V2 emitted CallbackRequested for checkpoint 4.",
 narration="The Lasna system detected the origin event and invoked our Guardian without a manual wallet action. This is a genuine Reactive testnet transaction beginning d d two e four a d. The Guardian processed checkpoint four, confirmed the source log shape, and emitted a Callback Requested event. The explorer lists a callback targeting Sepolia. That is the automation step at the heart of the project."),
dict(name="04-callback",title="STEP 3 — DESTINATION CALLBACK",subtitle="Ethereum Sepolia • Current official callback proxy",
 image="05-callback_genuine.png",badge="DELIVERY VERIFIED",metric="SUCCESS",
 note="Blockscout proof: 0xc4080d7429e9…3b138. Proxy deliverCallback succeeded in block 12,189,752.",
 narration="This is the decisive proof. The current official Sepolia callback proxy successfully delivered the request in block twelve million, one hundred eighty nine thousand, seven hundred fifty two. The callback transaction begins c four zero eight zero d. Quest Destination emitted Checkpoint Mirrored for task four. A separate contract read returned checkpoint Seen for task four equals true. The complete loop worked."),
dict(name="05-outro",title="REPRODUCIBLE. PUBLIC. TESTNET.",subtitle="Full proof bundle • GitHub source and on-chain explorers",
 image="01-source_genuine.png",badge="VERIFIED DEMONSTRATION",metric="3 / 3 STEPS",
 note="Live testnet demo • No production audit • No promised reward • Submission to organizer is separate.",
 narration="You can reproduce the contracts, inspect the code, and follow all three transaction hashes from the public GitHub project. We also documented an early failure: the wrong proxy and inadequate callback gas. Those problems were corrected before the successful run. This is testnet only, not an audited production system, and it does not prove any real-world task was completed. Thank you for reviewing the original LDN Reactive Omni demonstration.")
]

def textwrap_px(draw,s,max_width,f):
 words=s.split()
 lines=[];cur=""
 for word in words:
  test=(cur+" "+word).strip()
  if draw.textbbox((0,0),test,font=f)[2] <= max_width:cur=test
  else:
   if cur:lines.append(cur)
   cur=word
 if cur:lines.append(cur)
 return lines

def background():
 im=Image.new("RGB",(W,H),(7,16,28))
 d=ImageDraw.Draw(im)
 for y in range(H):
  t=y/(H-1)
  d.line([(0,y),(W,y)],fill=(int(7+9*t),int(16+12*t),int(28+16*t)))
 for i in range(8):
  x=1400+i*74
  d.line([(x,0),(x-380,H)], fill=(15,42,55),width=1)
 return im

def rounded_screenshot(im,source,xy=(88,240),wh=(1274,718)):
 src=Image.open(ROOT/source).convert("RGB")
 # Physical screenshot is genuine: only resized and cropped, not recreated or edited.
 tw,th=wh
 ratio=max(tw/src.width,th/src.height)
 nw,nh=math.ceil(src.width*ratio),math.ceil(src.height*ratio)
 src=src.resize((nw,nh),Image.Resampling.LANCZOS)
 ox=(nw-tw)//2;oy=(nh-th)//2
 src=src.crop((ox,oy,ox+tw,oy+th))
 mask=Image.new("L",(tw,th),0);md=ImageDraw.Draw(mask);md.rounded_rectangle((0,0,tw,th),radius=20,fill=255)
 d=ImageDraw.Draw(im)
 d.rounded_rectangle((xy[0]-4,xy[1]-4,xy[0]+tw+4,xy[1]+th+4),radius=24,outline=(64,109,124),width=4)
 im.paste(src,xy,mask)

def make_card(item,idx):
 im=background()
 d=ImageDraw.Draw(im)
 d.rounded_rectangle((88,61,285,107),radius=16,fill=(22,65,67))
 d.text((105,70),"LUXEDIGITALNEST",font=font(21,True),fill=CYAN)
 d.text((320,72),"REACTIVE OMNI  /  VERIFIED TESTNET CASE STUDY",font=font(21),fill=MUTED)
 d.text((88,134),item["title"],font=font(52,True),fill=LIGHT)
 d.text((89,204),item["subtitle"],font=font(27),fill=MUTED)
 rounded_screenshot(im,item["image"])
 bx=1392
 d.rounded_rectangle((bx,240,1820,958),radius=24,fill=(22,37,52),outline=(46,78,96),width=2)
 d.rounded_rectangle((bx+26,272,1790,319),radius=12,fill=(28,75,81))
 d.text((bx+45,283),item["badge"],font=font(23,True),fill=CYAN)
 d.text((bx+40,354),item["metric"],font=font(39,True),fill=GREEN)
 d.line([(bx+38,425),(bx+385,425)],fill=(49,77,96),width=2)
 y=462
 for line in textwrap_px(d,item["note"],347,font(26)):
  d.text((bx+37,y),line,font=font(26),fill=LIGHT)
  y+=45
 d.rounded_rectangle((bx+35,850,1790,903),radius=13,outline=(73,124,130),width=2)
 d.text((bx+55,862),"PUBLIC RECEIPTS • NO KEYS",font=font(22,True),fill=CYAN)
 d.line([(88,986),(1818,986)],fill=(42,78,96),width=2)
 d.text((90,1006),"REAL EXPLORER SCREENCAPTURE  /  NARRATED ORIGINAL WALKTHROUGH",font=font(21),fill=MUTED)
 d.text((1705,1008),f"{idx+1:02d} / 06",font=font(24,True),fill=CYAN)
 return im

async def audio_and_subtitles(item):
 name=item["name"]
 audio=ROOT/(name+".mp3");sub=ROOT/(name+".srt")
 sm=edge_tts.SubMaker()
 with audio.open("wb") as f:
  async for chunk in edge_tts.Communicate(item["narration"],SPEAKER,rate="-2%",pitch="-5Hz",boundary="WordBoundary").stream():
   if chunk["type"]=="audio":f.write(chunk["data"])
   elif chunk["type"]=="WordBoundary":sm.feed(chunk)
 text=sm.get_srt()
 sub.write_text(text,encoding="utf-8")
 return audio,sub

def duration(audio):
 p=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(audio)],capture_output=True,text=True,check=True)
 return float(p.stdout.strip())

def render_clip(item,idx,dur):
 name=item["name"];png=name+".png";mp3=name+".mp3";srt=name+".srt";out=name+".mp4"
 duration_str=f"{dur:.3f}"
 frames=int(math.ceil(dur*24))
 vf=("zoompan=z='min(zoom+0.00006,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24,subtitles="+srt+":force_style='FontName=Arial,FontSize=20,Outline=2,Shadow=0,MarginV=30'")
 cmd=["ffmpeg","-y","-hide_banner","-loglevel","error","-loop","1","-framerate","24","-i",png,"-i",mp3,"-vf",vf,"-af","apad=pad_dur=1.4","-t",duration_str,"-c:v","libx264","-preset","veryfast","-crf","21","-pix_fmt","yuv420p","-c:a","aac","-ar","48000","-b:a","160k","-movflags","+faststart",out]
 done=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
 if done.returncode:raise RuntimeError("FFmpeg scene "+name+" "+done.stderr[-1400:])
 print(json.dumps({"scene":name,"seconds":round(dur,2),"videoBytes":(ROOT/out).stat().st_size}),flush=True)

async def main():
 times=[]
 for i,scene in enumerate(SCENES):
  print(json.dumps({"phase":"narration", "scene":scene["name"]}),flush=True)
  await audio_and_subtitles(scene)
  dur=duration(ROOT/(scene["name"]+".mp3"))+1.2
  times.append(dur)
  make_card(scene,i).save(ROOT/(scene["name"]+".png"),quality=95)
  print(json.dumps({"phase":"ready","scene":scene["name"],"audioSecs":round(dur-1.2,2),"srtBytes":(ROOT/(scene["name"]+".srt")).stat().st_size}),flush=True)
 total=sum(times)
 if total>=179:raise ValueError("Official Reactive demo under 3min requirement FAILED "+str(total))
 (ROOT/"demo_manifest.json").write_text(json.dumps({"durationEstimate":total,"scenes":list(zip([x["name"] for x in SCENES],times)),"voice":SPEAKER,"sources":"Original browser captures of GitHub, Blockscout and Reactscan; all links verifiable","note":"Original narrated proof walkthrough, testnet only, no automated wallet actions"},indent=2),encoding="utf8")
 print(json.dumps({"phase":"all_audio_ready","totalDuration":round(total,2)}),flush=True)
 for i,(scene,dur) in enumerate(zip(SCENES,times)):
  render_clip(scene,i,dur)
 playlist=ROOT/"concat.txt"
 playlist.write_text("\n".join("file '"+s["name"]+".mp4'" for s in SCENES)+"\n",encoding="ascii")
 out=ROOT/"LDN_Reactive_Omni_Quest_Guardian_Proof_Demo_2026-11-22.mp4"
 cmd=["ffmpeg","-y","-hide_banner","-loglevel","error","-f","concat","-safe","0","-i","concat.txt","-c","copy","-movflags","+faststart",str(out)]
 res=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
 if res.returncode:raise RuntimeError("Concat failed "+res.stderr[-1500:])
 p=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration:stream=codec_name,width,height","-of","json",str(out)],capture_output=True,text=True,check=True)
 print(json.dumps({"phase":"FINAL_VIDEO","path":str(out),"sizeBytes":out.stat().st_size,"probe":json.loads(p.stdout)}),flush=True)

asyncio.run(main())
