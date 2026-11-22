import asyncio, pathlib, json
from playwright.async_api import async_playwright
OUT=pathlib.Path(r"C:\Users\gevab\Documents\ChatGPT\Crypto\ldn-reactive-omni-quest-guardian\video_assets")
OUT.mkdir(exist_ok=True)
ITEMS=[
("01-source","https://github.com/luxedigitalnest/ldn-reactive-omni-quest-guardian","LDN Reactive Omni Quest Guardian"),
("02-v2-contract","https://github.com/luxedigitalnest/ldn-reactive-omni-quest-guardian/blob/main/src/QuestDestinationV2.sol","QuestDestinationV2.sol"),
("03-origin","https://eth-sepolia.blockscout.com/tx/0xa9c3b35da1ca6e644aec5c8173015a192968cae0e616a296c66284dad1e0bea2","0xa9c3b35"),
("04-guardian","https://lasna.reactscan.net/tx/0xdd2e4ad174471e0e7a4764ac857eabebc33f3bb35b71a3aa977dab6a27ff8515","0xdd2e4ad"),
("05-callback","https://eth-sepolia.blockscout.com/tx/0xc4080d7429e952f0164d8b3dd4877df23c740e8fa402779fb52d753e33b3b138","0xc4080d7")
]
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(channel="chrome",headless=True)
  ctx=await browser.new_context(viewport={"width":1600,"height":900},device_scale_factor=1,color_scheme="dark")
  for name,url,needle in ITEMS:
   page=await ctx.new_page()
   try:
    resp=await page.goto(url,wait_until="domcontentloaded",timeout=25000)
    await page.wait_for_timeout(2800)
    for i in range(3):
     if needle.lower() in (await page.locator("body").inner_text(timeout=12000)).lower():break
     await page.wait_for_timeout(1300)
    body=(await page.locator("body").inner_text(timeout=12000))
    if "Cloudflare" in body[:700] or "Performing security verification" in body[:900]:
     print(json.dumps({"name":name,"failed":"cloudflare"}),flush=True);await page.close();continue
    if name=="03-origin" or name=="05-callback":
     try:await page.get_by_text("Transaction details").first.scroll_into_view_if_needed(timeout=4500)
     except:pass
    if name=="04-guardian":
     try:await page.get_by_text("CALLBACKS [1]").first.scroll_into_view_if_needed(timeout=3500)
     except:pass
    out=OUT/(name+"_genuine.png")
    await page.screenshot(path=str(out),full_page=False,animations="disabled",timeout=14000)
    print(json.dumps({"name":name,"status":resp.status if resp else None,"url":page.url,"title":await page.title(),"needleVisible":needle.lower() in body.lower(),"body":body[:200].replace("\n"," "), "size":out.stat().st_size}),flush=True)
   except Exception as e:print(json.dumps({"name":name,"ERROR":str(e)[:300]}),flush=True)
   finally:await page.close()
  await ctx.close();await browser.close()
asyncio.run(main())
