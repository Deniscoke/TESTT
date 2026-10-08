# Validation outreach and interview plan

**For:** the V1 and V2 steps in [`recommendation.md`](recommendation.md).
**Who sends:** the **owner only**, personally. Claude has not sent and will not send any message, and has not created any post or listing.

---

## 1. Ground rules (compliance and anti-spam)

1. **Read each community's rules first, every time.** The subreddit rules could not be retrieved during research [U]. Many pixel-art communities limit self-promotion or require a ratio of contribution to promotion. If a channel bans research or promotional posts, do not post there.
2. **No cold DMs and no mass messaging.** Only DM people who **opted in publicly**, for example by replying "happy to chat" or ticking the opt-in box on the optional form.
3. **Disclose who you are.** Say that you are the developer researching a possible paid tool. Never pose as a neutral user.
4. **Don't pitch in discovery.** V1 asks about past behavior, not about our idea (see section 4).
5. **No incentives that skew answers.** At most, offer a free copy if the tool ships, and say so up front. No cash raffles, since they bring legal and tax complications.
6. **Collect as little data as possible, and keep personal data out of Git.** The repo README forbids storing customer data. Keep raw notes privately. Commit only anonymized summaries labeled P01…P12, with no handles, emails or quotes that could identify someone.
7. **Consent:** say how notes will be used, get a clear "yes" before recording, and delete raw notes within 90 days or sooner on request.
8. **Respect "no".** Send at most one polite follow-up. Then stop.
9. **No fabricated quotes.** Synthesis uses only what participants actually said.
10. **One post per community per validation round.** Never cross-post the same text within the same day.

---

## 2. Channels (in priority order)

| Channel | Use | Notes |
|---|---|---|
| Owner's own network (gamedev friends, jam teammates) | Interviews | The warmest and safest channel. Start here. |
| Aseprite Community forum ([community.aseprite.org](https://community.aseprite.org)) | One discussion post | The jaggy and orphan threads already exist there [V]. Check the category rules first. |
| itch.io community forums | One discussion post in the most relevant board | [U] Board names and rules have not been checked. Confirm before posting. |
| Pixel-art and gamedev Discords | Only in channels where research posts are allowed | Ask a moderator first if it is unclear. |
| Reddit (r/aseprite, r/PixelArt, r/gamedev) | Only if the rules allow it | [U] The rules could not be fetched. Many restrict self-promotion. |

---

## 3. Scripts

### 3.1 Public discussion post (problem discovery, with no product mentioned)

> **Title:** How do you catch technical pixel mistakes before your sprites go into the game?
>
> Hi! I'm a solo dev (disclosure: I'm exploring whether to build a small Aseprite tool, so I'm asking for research. Nothing is for sale).
>
> When you finish a sprite or tileset, how do you check for things like stray/orphan pixels, doubled corners in lines, jaggy curves, banding, or leftover semi-transparent pixels?
>
> - Do you have a routine, or do you just eyeball it?
> - When was the last time one of these slipped through, and how did you notice?
>
> If you'd be up for a 20-minute chat about your workflow, reply "happy to chat" and I'll DM you. No pitch, and I'll share a summary of what I learn here afterwards.

### 3.2 DM to someone who opted in

> Hi {name}, thanks for offering to chat on {thread}! I'm {owner name}, a solo dev looking into how people check their pixel art for technical mistakes. Would 20 minutes on a call or text chat work this week or next? I'll only ask about how you work today, and I'm not selling anything. If you'd like, I'll send you a short summary of the findings. Totally fine if not!

### 3.3 Confirmation and consent

> Great, {time} works. Quick note on how I'll handle it: I'll take written notes (and record only if you say yes), use them only to decide whether to build the tool, keep them private, and delete them within 90 days. Nothing with your name or handle will be published. You can skip any question or stop at any time.

### 3.4 One follow-up (only if there is no reply after 5 or more days)

> Just checking in on this. No worries at all if you're busy, and I won't follow up again. Thanks!

### 3.5 Prototype-tester invite (V2, only for V1 participants who said yes to testing, and only after the owner approves building)

> Hi {name}, thanks again for the chat. I built a rough prototype based on what people told me: an Aseprite extension that *marks* (never changes) orphan pixels, doubles and semi-transparent pixels on a separate layer. Would you try it on 2–3 of your own sprites and tell me which flags were useful and which were noise? It's a private test build, not for sale. It takes about 15 minutes, and a short feedback form is included.

### 3.6 Close the loop (public, in the original thread)

> Thanks to everyone who shared their workflow! Summary of what I heard: {3–5 anonymized themes}. {Decision: building / not building / changing direction}.

---

## 4. Interview plan (V1)

**Format:** 20–25 minutes by voice or text. Aim for 8–12 interviews over about 2 weeks.

### Screener (ask before booking)
1. Which tools do you use for pixel art? (We need Aseprite users. Others are still useful as a comparison.)
2. What do you use it for: your own game, asset packs, client work, or a hobby?
3. Roughly how many sprites or tiles did you finish in the last month?

### Questions (about past behavior, without mentioning the idea)
1. Walk me through the last sprite you finished. What happened between "done drawing" and "in the game or shipped"?
2. Do you do any checking pass? What exactly do you look for, and how?
3. Tell me about the last time a technical mistake (stray pixel, jaggy line, banding, wrong color, semi-transparent pixel) got through. How did you find out? What did it cost you?
4. Have you ever asked someone for critique on technical cleanliness? Where, and how long did you wait?
5. Have you tried any scripts, extensions or tools for this? What happened? Why did you keep or drop them?
6. Which Aseprite extensions or tools have you **paid** for? Roughly how much? What made them worth it?
7. *(Only now describe the concept in one neutral sentence.)* If a tool marked these issues on a separate layer inside Aseprite, which checks would matter and which would annoy you?
8. Price check (directional only, because stated willingness to pay is unreliable): at what price would this feel *too cheap to trust*, *a bargain*, *getting expensive*, *too expensive*?
9. Who else should I talk to? (Only if they're comfortable passing on the invite. We don't ask for other people's contact details.)

### Note template (kept privately; only the anonymized version goes to Git)

```
ID: P0x            Date:            Channel:
Tools used:        Use case:        Volume/month:
Has checking routine? (Y/N + how):
Recent specific incident? (Y/N + 1-line paraphrase, no identifying detail):
Tools tried/dropped:
Paid for extensions? (Y/N, price band):
Checks valued / disliked:
Price bands (too cheap / bargain / expensive / too expensive):
Would test prototype? (Y/N):
```

### Synthesis (feeds the V1 stop/go gate)

| Signal | Counts as "yes" when … |
|---|---|
| Aseprite game-sprite user | Uses Aseprite for game or asset art |
| Recent specific incident | Describes a concrete occasion in the last 3 months, not a hypothetical |
| Unprompted interest in paying | Before Q7, mentions paying for, or looking for, a tool for this |
| Paid tool buyer | Has paid for at least one Aseprite extension or pixel tool |

The **GO** threshold is in `recommendation.md` §5. Record the counts in a table. Summarize themes without quotes, or use only quotes the participant explicitly allowed.

---

## 5. Prototype test (V2) feedback form

1. Which sprites did you test? (Type and size only. Don't upload the art.)
2. For each check: how many flags were useful, how many were noise, and how many were intentional choices?
3. Did the marker layer fit your workflow? (Yes / Partly / No, and why)
4. Would you keep it installed? (Yes / Maybe / No)
5. What is the one thing that would make you pay for it?

---

## 6. What is explicitly *not* allowed in this phase

- Posting on behalf of the owner, or any automated posting or messaging.
- Creating an itch.io page, a pre-order, a waitlist page, a landing page or ads.
- Collecting emails into any tool or storing personal data in this repository.
- Offering discounts or prices publicly before the owner approves them.
