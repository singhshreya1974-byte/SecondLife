import json
import os
import random
import sqlite3
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "second_life.db")
INSIGHTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_insights.json")

rng = random.Random(42)

CATEGORIES = [
    "Books",
    "Calculators",
    "Cycles",
    "Lab Gear",
    "Electronics",
    "Hostel Items",
]

CONDITIONS = ["Like New", "Good", "Fair", "Worn"]

MONTHS = [
    (1, "Jan"), (2, "Feb"), (3, "Mar"), (4, "Apr"),
    (5, "May"), (6, "Jun"), (7, "Jul"), (8, "Aug"),
    (9, "Sep"), (10, "Oct"), (11, "Nov"), (12, "Dec"),
]

# Seasonality: peaks July-August and Dec-Jan, dips in May
SEASON_MULTIPLIER = {
    1: 1.06, 2: 1.00, 3: 0.99, 4: 0.97,
    5: 0.88, 6: 0.96, 7: 1.09, 8: 1.10,
    9: 1.02, 10: 1.00, 11: 0.99, 12: 1.06,
}

# Category depreciation curves (age retention at 0.5, 1, 2, 3, 4 yrs)
# Books drop fastest in year 1; Calculators hold value; Cycles hinge heavily on condition
CATEGORY_AGE_CURVES = {
    "Books":        {0.5: 0.62, 1.0: 0.48, 2.0: 0.34, 3.0: 0.25, 4.0: 0.19},
    "Calculators":  {0.5: 0.82, 1.0: 0.72, 2.0: 0.62, 3.0: 0.52, 4.0: 0.43},
    "Cycles":       {0.5: 0.78, 1.0: 0.70, 2.0: 0.61, 3.0: 0.54, 4.0: 0.46},
    "Lab Gear":     {0.5: 0.75, 1.0: 0.62, 2.0: 0.50, 3.0: 0.40, 4.0: 0.32},
    "Electronics":  {0.5: 0.74, 1.0: 0.60, 2.0: 0.46, 3.0: 0.34, 4.0: 0.25},
    "Hostel Items": {0.5: 0.72, 1.0: 0.58, 2.0: 0.46, 3.0: 0.36, 4.0: 0.28},
}

CATEGORY_CONDITION_MULT = {
    "Books":        {"Like New": 1.16, "Good": 0.96, "Fair": 0.76, "Worn": 0.56},
    "Calculators":  {"Like New": 1.12, "Good": 0.97, "Fair": 0.80, "Worn": 0.62},
    "Cycles":       {"Like New": 1.22, "Good": 0.94, "Fair": 0.68, "Worn": 0.46},
    "Lab Gear":     {"Like New": 1.13, "Good": 0.95, "Fair": 0.76, "Worn": 0.58},
    "Electronics":  {"Like New": 1.15, "Good": 0.94, "Fair": 0.72, "Worn": 0.52},
    "Hostel Items": {"Like New": 1.14, "Good": 0.95, "Fair": 0.74, "Worn": 0.54},
}

CATALOG_ITEMS = {
    "Books": [
        ("CLRS Introduction to Algorithms", "CS Core", [950, 1100], "CSE", "Sem 3"),
        ("Beer & Johnston Mechanics", "Core Textbook", [780, 890], "ME", "Sem 2"),
        ("Sedra & Smith Microelectronics", "Core Textbook", [860, 990], "ECE", "Sem 4"),
        ("B.S. Grewal Higher Engg Math", "First Year", [720, 840], "All", "Sem 1"),
        ("Silberschatz Operating Systems", "CS Core", [880, 960], "CSE", "Sem 5"),
        ("R.K. Bansal Strength of Materials", "Core Textbook", [640, 740], "CE", "Sem 3"),
    ],
    "Calculators": [
        ("Casio fx-991EX ClassWiz", "Scientific", [1200, 1295, 1350], "All", "Sem 1"),
        ("Casio fx-991ES Plus", "Scientific", [1100, 1200], "ME", "Sem 3"),
        ("Casio fx-82MS 2nd Gen", "Basic Scientific", [650, 750], "All", "Sem 1"),
        ("Casio fx-991CW Scientific", "Scientific", [1450, 1595], "ECE", "Sem 2"),
        ("TI BA II Plus Financial", "Programmable", [2800, 3100], "CSE", "Sem 5"),
        ("Casio fx-991MS Matrix", "Scientific", [950, 1050], "CE", "Sem 3"),
    ],
    "Cycles": [
        ("Hero Sprint Single-Speed", "Single Speed", [6200, 6800], "All", "All"),
        ("Btwin MyBike Commuter", "Commuter", [7500, 8200], "All", "All"),
        ("Hercules Roadeo A75 21-Speed", "Geared MTB", [11500, 12800], "All", "All"),
        ("Firefox Road Runner Pro", "Hybrid", [13500, 14800], "All", "All"),
        ("Mach City Munich", "Single Speed", [8400, 9200], "All", "All"),
    ],
    "Lab Gear": [
        ("Omega Mini Drafter + Board", "Drawing", [1150, 1300], "ME", "Sem 1"),
        ("White Cotton Lab Coat", "Lab Wear", [450, 550], "All", "Sem 1"),
        ("Workshop Blue Khaki Apron", "Lab Wear", [380, 460], "ME", "Sem 1"),
        ("Mitutoyo Vernier Caliper", "Measurement", [1850, 2100], "ME", "Sem 3"),
        ("Staedtler Engineering Compass", "Drawing", [850, 980], "CE", "Sem 2"),
    ],
    "Electronics": [
        ("Anker 20000mAh Power Bank", "Power", [2200, 2600], "All", "All"),
        ("Sony MDR Wired Earphones", "Audio", [1100, 1400], "All", "All"),
        ("Logitech Wireless Mouse + Pad", "Peripherals", [950, 1250], "CSE", "Sem 2"),
        ("USB-C 6-in-1 Hub + HDMI", "Adapters", [1500, 1850], "CSE", "Sem 4"),
        ("6-Socket Surge Extension Board", "Power", [650, 820], "All", "All"),
    ],
    "Hostel Items": [
        ("Prestige 1.5L Electric Kettle", "Appliances", [1150, 1350], "All", "All"),
        ("Philips Rechargeable Study Lamp", "Lighting", [900, 1150], "All", "All"),
        ("20L Bucket + Mug + Laundry Bin", "Room Essentials", [550, 700], "All", "All"),
        ("Foldable Aluminum Laptop Stand", "Desk Setup", [850, 1050], "CSE", "Sem 1"),
        ("6ft Yoga Mat + Resistance Band", "Fitness", [750, 950], "All", "All"),
    ],
}

FAKE_NICKNAMES = [
    "PixelPanda", "MechMaverick", "CircuitFox", "LibraryOwl", "HostelChef",
    "Gearhead26", "CoffeeCompiler", "VeloRider", "DraftMaster", "BinaryBard",
    "SolarCalc", "KettleKing", "GreenBean", "CampusSprout", "ExamNinja",
    "SolderPro", "PageTurner", "PedalPulse", "CodeBrew", "LabCoatLeo",
    "FestShutter", "AcousticAce", "MatrixMaker", "BridgeBuilder", "NodeNomad",
    "FreshmanScout", "ThesisTamer", "DormMinimal", "EcoSpark", "QuietReader",
    "SignalSage", "TorqueTitan", "PixelScout", "NotebookNerd", "CycleCraft",
    "AmpereAlly", "DraftingDove", "LateNightTea", "CampusNewbie", "FirstSemSam",
]

BRANCHES = ["CSE", "ECE", "ME", "CE", "EE"]
AVATARS = ["🦊", "🐼", "🦉", "🌱", "🚲", "📚", "⚡", "🎸", "🧪", "🧭"]
STICKER_POOL = [
    "🌱 Eco Warrior",
    "📚 Bookworm",
    "🚲 Pedal Pro",
    "⚡ Lab Ace",
    "🎯 Fair Pricer",
    "☕ Hostel Helper",
    "🎭 Fest Crew",
    "🔧 Fixer Upper",
]
THEME_COLORS = ["#184D38", "#0F766E", "#B45309", "#1D4ED8", "#4338CA"]


def round_ten(n: float) -> int:
    return max(30, int(round(n / 10.0) * 10))


def create_schema(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.executescript(
        """
        DROP TABLE IF EXISTS past_sales;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS events;
        DROP TABLE IF EXISTS listings;
        DROP TABLE IF EXISTS bids;
        DROP TABLE IF EXISTS counter_offers;
        DROP TABLE IF EXISTS swaps;
        DROP TABLE IF EXISTS rentals;
        DROP TABLE IF EXISTS needs;
        DROP TABLE IF EXISTS reviews;
        DROP TABLE IF EXISTS notifications;
        DROP TABLE IF EXISTS lost_found;

        CREATE TABLE past_sales (
            id TEXT PRIMARY KEY,
            item_name TEXT NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT NOT NULL,
            condition TEXT NOT NULL,
            age_years REAL NOT NULL,
            original_price INTEGER NOT NULL,
            sold_price INTEGER NOT NULL,
            retention_pct INTEGER NOT NULL,
            month_sold INTEGER NOT NULL,
            month_name TEXT NOT NULL,
            listing_type TEXT NOT NULL,
            branch TEXT NOT NULL,
            semester TEXT NOT NULL,
            is_outlier INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            nickname TEXT NOT NULL,
            branch TEXT NOT NULL,
            year INTEGER NOT NULL,
            hostel TEXT NOT NULL,
            avatar_emoji TEXT NOT NULL,
            profile_stickers TEXT NOT NULL,
            theme_color TEXT NOT NULL,
            bio TEXT NOT NULL,
            status_line TEXT NOT NULL,
            completed_trades INTEGER NOT NULL,
            cancelled_trades INTEGER NOT NULL,
            avg_response_mins INTEGER NOT NULL,
            condition_accuracy REAL NOT NULL,
            rent_on_time INTEGER NOT NULL,
            rent_late INTEGER NOT NULL,
            campus_verified INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE events (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_date TEXT NOT NULL,
            venue TEXT NOT NULL,
            organizer TEXT NOT NULL,
            bundle_suggestion TEXT NOT NULL,
            description TEXT NOT NULL
        );

        CREATE TABLE listings (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT NOT NULL,
            condition TEXT NOT NULL,
            condition_sticker TEXT NOT NULL,
            age_years REAL NOT NULL,
            original_price INTEGER NOT NULL,
            asking_price INTEGER NOT NULL,
            min_acceptable_price INTEGER,
            negotiable INTEGER NOT NULL DEFAULT 1,
            suggested_price INTEGER NOT NULL,
            quick_sale_price INTEGER NOT NULL,
            patient_price INTEGER NOT NULL,
            rent_per_week INTEGER NOT NULL,
            suggested_deposit INTEGER NOT NULL,
            transaction_type TEXT NOT NULL DEFAULT 'sale',
            listing_types TEXT NOT NULL,
            swap_for TEXT NOT NULL,
            swap_categories TEXT NOT NULL DEFAULT '[]',
            swap_multi_ok INTEGER NOT NULL DEFAULT 0,
            borrow_min_days INTEGER,
            borrow_max_days INTEGER,
            collection_location TEXT NOT NULL DEFAULT 'Central Library Steps',
            borrow_conditions TEXT NOT NULL DEFAULT '',
            available_from TEXT,
            available_until TEXT,
            mascot_text TEXT NOT NULL DEFAULT '',
            mascot_icon TEXT NOT NULL DEFAULT '🤖',
            description TEXT NOT NULL,
            monologue TEXT NOT NULL,
            addons TEXT NOT NULL,
            handwritten_notes INTEGER NOT NULL DEFAULT 0,
            color TEXT NOT NULL,
            edition TEXT NOT NULL,
            branch TEXT NOT NULL,
            semester TEXT NOT NULL,
            custom_note TEXT NOT NULL,
            seller_id TEXT NOT NULL,
            event_id TEXT,
            leaving_campus_date TEXT,
            allow_bidding INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'available',
            created_at TEXT NOT NULL
        );

        CREATE TABLE bids (
            id TEXT PRIMARY KEY,
            listing_id TEXT NOT NULL,
            bidder_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE counter_offers (
            id TEXT PRIMARY KEY,
            listing_id TEXT NOT NULL,
            buyer_id TEXT NOT NULL,
            offer_amount INTEGER NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );

        CREATE TABLE swaps (
            id TEXT PRIMARY KEY,
            listing_id TEXT NOT NULL,
            proposer_id TEXT NOT NULL,
            offered_item TEXT NOT NULL,
            offered_value INTEGER NOT NULL,
            target_value INTEGER NOT NULL,
            value_balance_diff INTEGER NOT NULL,
            balance_text TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );

        CREATE TABLE rentals (
            id TEXT PRIMARY KEY,
            listing_id TEXT NOT NULL,
            renter_id TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            weekly_rate INTEGER NOT NULL,
            deposit INTEGER NOT NULL,
            total_rent INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            return_timeliness TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE needs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            branch TEXT NOT NULL,
            semester TEXT NOT NULL,
            max_budget INTEGER NOT NULL,
            requester_id TEXT NOT NULL,
            notes TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE reviews (
            id TEXT PRIMARY KEY,
            trade_id TEXT NOT NULL,
            reviewer_id TEXT NOT NULL,
            reviewee_id TEXT NOT NULL,
            role TEXT NOT NULL,
            rating INTEGER NOT NULL,
            condition_accurate INTEGER NOT NULL DEFAULT 1,
            comment TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE notifications (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            listing_id TEXT,
            need_id TEXT,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE lost_found (
            id TEXT PRIMARY KEY,
            post_type TEXT NOT NULL,
            title TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT NOT NULL,
            poster_name TEXT NOT NULL,
            contact_note TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()


def seed_past_sales(conn: sqlite3.Connection) -> list[dict]:
    cur = conn.cursor()
    records = []
    ages = [0.5, 1.0, 2.0, 3.0, 4.0]
    listing_types = ["sale", "sale", "sale", "swap", "rent"]

    # Distribute 200 records evenly across 6 categories (34, 34, 33, 33, 33, 33 = 200)
    counts = {
        "Books": 34,
        "Calculators": 34,
        "Cycles": 33,
        "Lab Gear": 33,
        "Electronics": 33,
        "Hostel Items": 33,
    }

    idx = 1
    for cat_idx, (cat, count) in enumerate(counts.items()):
        pool = CATALOG_ITEMS[cat]
        for i in range(count):
            name, subcat, mrp_opts, branch, sem = pool[i % len(pool)]
            orig_price = rng.choice(mrp_opts)
            age = ages[i % len(ages)]
            cond = CONDITIONS[(i + cat_idx + (i // len(CONDITIONS))) % len(CONDITIONS)]
            month_num, month_name = MONTHS[(idx - 1) % 12]
            ltype = rng.choice(listing_types)

            age_ret = CATEGORY_AGE_CURVES[cat][age]
            cond_mult = CATEGORY_CONDITION_MULT[cat][cond]
            season_mult = SEASON_MULTIPLIER[month_num]
            noise = rng.uniform(0.93, 1.07)

            # ~5% outliers (either urgent dump sale or collector/mint demand)
            is_outlier = 1 if idx % 20 == 0 else 0
            outlier_mult = rng.choice([0.72, 1.24]) if is_outlier else 1.0

            raw_sold = orig_price * age_ret * cond_mult * season_mult * noise * outlier_mult
            sold_price = min(int(orig_price * 0.94), round_ten(raw_sold))
            retention_pct = round((sold_price / orig_price) * 100)

            rec = {
                "id": f"PS-{idx:03d}",
                "item_name": name,
                "category": cat,
                "subcategory": subcat,
                "condition": cond,
                "age_years": age,
                "original_price": orig_price,
                "sold_price": sold_price,
                "retention_pct": retention_pct,
                "month_sold": month_num,
                "month_name": month_name,
                "listing_type": ltype,
                "branch": branch,
                "semester": sem,
                "is_outlier": is_outlier,
            }
            records.append(rec)
            cur.execute(
                """
                INSERT INTO past_sales (
                    id, item_name, category, subcategory, condition, age_years,
                    original_price, sold_price, retention_pct, month_sold, month_name,
                    listing_type, branch, semester, is_outlier
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                tuple(rec.values()),
            )
            idx += 1

    conn.commit()
    return records


def seed_users(conn: sqlite3.Connection) -> list[dict]:
    cur = conn.cursor()
    users = []
    hostels = ["Hostel A", "Hostel B", "Hostel C", "Hostel D", "Girls Hostel 1", "Girls Hostel 2"]

    for i, nick in enumerate(FAKE_NICKNAMES):
        uid = f"USR-{i + 1:02d}"
        branch = BRANCHES[i % len(BRANCHES)]
        year = 4 if i < 16 else (3 if i < 26 else (2 if i < 34 else 1))

        # Make last 4 users brand-new ("New here" badge)
        if i >= 36:
            completed = 0
            cancelled = 0
            resp_mins = 20
            acc = 5.0
            r_on = 0
            r_late = 0
            bio = "Just joined campus! Looking for 1st-year essentials."
        elif i < 8:
            # Campus Legends
            completed = rng.randint(12, 22)
            cancelled = rng.randint(0, 1)
            resp_mins = rng.randint(4, 15)
            acc = round(rng.uniform(4.7, 5.0), 2)
            r_on = rng.randint(3, 6)
            r_late = 0
            bio = "Final-year senior passing on gear before convocation."
        else:
            completed = rng.randint(2, 10)
            cancelled = rng.randint(0, 2)
            resp_mins = rng.randint(8, 55)
            acc = round(rng.uniform(4.0, 4.9), 2)
            r_on = rng.randint(1, 4)
            r_late = rng.randint(0, 1)
            bio = f"{branch} Year {year} student. Always open to fair swaps and quick handovers."

        campus_verified = 1 if (i < 24 and i % 3 != 2) else 0
        stickers = rng.sample(STICKER_POOL, k=2 if i < 36 else 1)
        u = {
            "id": uid,
            "nickname": nick,
            "branch": branch,
            "year": year,
            "hostel": hostels[i % len(hostels)],
            "avatar_emoji": AVATARS[i % len(AVATARS)],
            "profile_stickers": json.dumps(stickers),
            "theme_color": THEME_COLORS[i % len(THEME_COLORS)],
            "bio": bio,
            "status_line": "Leaving in May — clearing desk!" if year == 4 else "Looking for good deals",
            "completed_trades": completed,
            "cancelled_trades": cancelled,
            "avg_response_mins": resp_mins,
            "condition_accuracy": acc,
            "rent_on_time": r_on,
            "rent_late": r_late,
            "campus_verified": campus_verified,
        }
        users.append(u)
        cur.execute(
            """
            INSERT INTO users (
                id, nickname, branch, year, hostel, avatar_emoji, profile_stickers,
                theme_color, bio, status_line, completed_trades, cancelled_trades,
                avg_response_mins, condition_accuracy, rent_on_time, rent_late, campus_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(u.values()),
        )
    conn.commit()
    return users


def seed_events(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    today = datetime(2026, 11, 25)
    events_data = [
        (
            "EVT-01",
            "CLF Cultural Fest",
            "Cultural Fest",
            (today + timedelta(days=9)).strftime("%Y-%m-%d"),
            "Open Air Amphitheatre",
            "FestShutter (Cultural Sec)",
            "Rent a DSLR/Instax, ethnic kurta, or acoustic guitar for 3 days",
            "Annual 3-day literature, music & stage fest. Rent outfits, props & cameras instead of buying one-time gear.",
        ),
        (
            "EVT-02",
            "24h Campus Hackathon",
            "Hackathon",
            (today + timedelta(days=14)).strftime("%Y-%m-%d"),
            "Innovation Centre Hall",
            "CodeBrew (Tech Club)",
            "Rent power banks, extension boards, laptop stands & spare chargers",
            "Overnight build sprint. Grab extra extension strips, cooling stands, and 20,000mAh backups from seniors.",
        ),
        (
            "EVT-03",
            "Senior Farewell Gala",
            "Farewell",
            (today + timedelta(days=26)).strftime("%Y-%m-%d"),
            "Main Auditorium",
            "PixelPanda (Batch 26)",
            "Buy or rent blazers, ethnic wear & camera tripods",
            "Passing the torch! Final-years listing formal wear and room gear as they pack up.",
        ),
        (
            "EVT-04",
            "Techfest Robotics & Expo",
            "Techfest",
            (today + timedelta(days=34)).strftime("%Y-%m-%d"),
            "Mechanical Block Courtyard",
            "SolderPro (Robotics Soc)",
            "Bundle: Arduino sensors, calipers, multimeters & lab coats",
            "Prototype faster with pre-tested lab kits, soldering irons, and drawing tools.",
        ),
        (
            "EVT-05",
            "Fresher's Welcome Week",
            "Fresher's Week",
            (today + timedelta(days=48)).strftime("%Y-%m-%d"),
            "Central Lawn & Hostels",
            "CampusSprout (Mentors)",
            "Starter pack: Hero cycle + Casio fx-991EX + 1st-sem books + kettle",
            "Everything a first-year needs in week one without paying full retail MRP.",
        ),
    ]
    cur.executemany(
        """
        INSERT INTO events (id, name, event_type, event_date, venue, organizer, bundle_suggestion, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        events_data,
    )
    conn.commit()


def seed_live_marketplace(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    today = datetime(2026, 11, 25)

    active_listings = [
        (
            "LST-101", "Casio fx-991EX ClassWiz", "Calculators", "Scientific",
            "Good", "Well Loved", 2.0, 1200, 740, 650, 1, 740, 660, 820, 70, 250,
            "sale", json.dumps(["sale", "swap", "rent"]), "Sem 4 Fluid Mechanics Book",
            json.dumps(["Books"]), 1, None, None, "Central Library Steps", "",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=30)).strftime("%Y-%m-%d"),
            "Psst! Exams are coming. After 2 years of formulas, I'm still dialed in for those equations.", "🧮",
            "Dual-powered solar + battery scientific calculator, zero dead pixels.",
            "Hi, I'm a Casio fx-991EX. I survived 2 years of Mechanics and I still work.",
            json.dumps(["Slide-on hard cover", "Fresh button cell"]), 0, "Matte Black",
            "2nd Edition", "ME", "Sem 3", "Will show matrix & integration test in person!",
            "USR-01", None, (today + timedelta(days=9)).strftime("%Y-%m-%d"), 1, "available",
            "2026-11-24T14:20:00Z"
        ),
        (
            "LST-102", "Hero Sprint Single-Speed Cycle", "Cycles", "Single Speed",
            "Good", "Well Loved", 2.0, 6500, 3600, 3200, 1, 3680, 3250, 4050, 300, 1000,
            "sale", json.dumps(["sale", "rent"]), "",
            json.dumps([]), 0, None, None, "Hostel D Gate 2", "",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=25)).strftime("%Y-%m-%d"),
            "Hi! I'm a bicycle. I've been around for 2 years, but I've still got plenty of campus rides left in me!", "🚲",
            "Reliable hostel-to-lecture commuter with fresh rear brake pads and bell.",
            "Hey rider, I'm a matte-green Hero Sprint. Two years of 8 AM sprints—zero creaks.",
            json.dumps(["U-Lock + 2 keys", "Mudguards", "Bottle cage"]), 0, "Forest Green",
            "26T Frame", "All", "All", "Parked at Hostel D Gate 2 for test rides.",
            "USR-08", "EVT-05", (today + timedelta(days=18)).strftime("%Y-%m-%d"), 1, "available",
            "2026-11-24T11:10:00Z"
        ),
        (
            "LST-103", "CLRS Introduction to Algorithms", "Books", "CS Core",
            "Like New", "Like New", 1.0, 1050, 580, 500, 1, 600, 530, 670, 60, 200,
            "sale", json.dumps(["sale", "swap", "rent"]), "Silberschatz Operating Systems",
            json.dumps(["Books"]), 1, None, None, "CS Dept Lobby", "",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=45)).strftime("%Y-%m-%d"),
            "Hey! I've survived 2 semesters in like new shape. Ready to help you survive yours?", "📘",
            "4th edition hardcover with clean binding and tabbed DP chapters.",
            "Hi, I'm CLRS 4th Ed. One semester of CSE coding prep, zero pen scribbles.",
            json.dumps(["Color sticky index tabs"]), 1, "Navy Blue",
            "4th Edition", "CSE", "Sem 3", "Includes my handwritten recurrence cheat-sheet tucked inside!",
            "USR-03", None, None, 0, "available",
            "2026-11-24T09:45:00Z"
        ),
        (
            "LST-104", "Anker 20000mAh Power Bank + Earphones", "Electronics", "Power",
            "Like New", "Like New", 0.5, 2500, 1950, None, 1, 1980, 1780, 2150, 180, 500,
            "rent", json.dumps(["rent", "sale", "swap"]), "Laptop Stand or USB-C Hub",
            json.dumps(["Electronics", "Hostel Items"]), 1, 1, 14, "Innovation Centre Desk", "Return with USB-C cable",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=20)).strftime("%Y-%m-%d"),
            "I'm only visiting your desk for a week—charged up and ready for your sprint!", "🔋",
            "Dual USB-A + USB-C fast charging bank, holds 4 full phone charges.",
            "Hey! I'm an Anker 20K brick. Kept two teams alive at last semester's Hackathon.",
            json.dumps(["Braided USB-C cable", "Pouch"]), 0, "Graphite",
            "PD 22.5W", "All", "All", "Ideal for the upcoming 24h Campus Hackathon!",
            "USR-02", "EVT-02", None, 1, "available",
            "2026-11-23T18:30:00Z"
        ),
        (
            "LST-105", "Omega Mini Drafter + Drawing Board", "Lab Gear", "Drawing",
            "Fair", "Battle-Scarred", 2.0, 1200, 460, None, 1, 470, 410, 530, 50, 150,
            "swap", json.dumps(["swap", "sale", "rent"]), "A2 Carrying Tube or Lab Coat",
            json.dumps(["Lab Gear", "Books"]), 1, None, None, "Mech Workshop Porch", "",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=30)).strftime("%Y-%m-%d"),
            "Trade me fairly! After 2 years of campus duty in fair shape, I'm ready for a swap.", "🧪",
            "Smooth parallel bar and tight 90-degree protractor clamp.",
            "Hi, I'm an Omega Mini Drafter. A few ink smudges from EG-101, but dead accurate.",
            json.dumps(["Clip set", "30/60 set square"]), 0, "Silver Steel",
            "Standard A2", "CE", "Sem 1", "Saved me in Engineering Graphics!",
            "USR-09", "EVT-04", (today + timedelta(days=7)).strftime("%Y-%m-%d"), 0, "available",
            "2026-11-23T16:15:00Z"
        ),
        (
            "LST-106", "Prestige 1.5L Electric Kettle + Lamp", "Hostel Items", "Appliances",
            "Good", "Well Loved", 1.0, 1300, 720, 620, 0, 740, 660, 820, 70, 200,
            "sale", json.dumps(["sale", "rent"]), "",
            json.dumps([]), 0, None, None, "Hostel B Common Room", "",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=15)).strftime("%Y-%m-%d"),
            "Hostel MVP for one year! Still going strong for late-night study sessions.", "☕",
            "Boils Maggi water in 3 minutes, auto-cutoff works perfectly.",
            "Hey! I'm your midnight exam fuel station. Clean steel interior, zero leaks.",
            json.dumps(["Detachable 360 base"]), 0, "Brushed Steel",
            "1.5 Litre", "All", "All", "Descaled with vinegar yesterday.",
            "USR-13", "EVT-05", (today + timedelta(days=5)).strftime("%Y-%m-%d"), 1, "available",
            "2026-11-23T12:00:00Z"
        ),
        (
            "LST-107", "Fujifilm Instax + CLF Cultural Strap", "Electronics", "Audio",
            "Like New", "Like New", 1.0, 5500, 3700, None, 1, 3750, 3400, 4100, 350, 1000,
            "rent", json.dumps(["rent", "sale", "swap"]), "Acoustic Guitar or Gimbal",
            json.dumps(["Electronics"]), 0, 2, 7, "Amphitheatre Gate 1", "Bring own film pack",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=20)).strftime("%Y-%m-%d"),
            "I'm only visiting your desk for a week—charged up and ready for your sprint!", "🔋",
            "Mint condition instant camera with woven cultural fest lanyard.",
            "Hey! I'm your CLF memory maker. Shot 40 polaroids at Cultural Night—rent me!",
            json.dumps(["Woven fest strap", "4 AA batteries"]), 0, "Warm Silver",
            "Mini 12", "All", "All", "Available for weekend CLF fest rental.",
            "USR-21", "EVT-01", None, 1, "available",
            "2026-11-22T15:10:00Z"
        ),
        (
            "LST-108", "Beer & Johnston Engineering Mechanics", "Books", "Core Textbook",
            "Good", "Well Loved", 2.0, 850, 290, 250, 1, 280, 240, 320, 40, 100,
            "sale", json.dumps(["sale", "swap"]), "Strength of Materials (Bansal)",
            json.dumps(["Books"]), 1, None, None, "SAC Cafeteria", "",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=60)).strftime("%Y-%m-%d"),
            "Hey! I've survived 4 semesters in good shape. Ready to help you survive yours?", "📘",
            "SI Units edition, intact spine, solved problem tabs on truss chapters.",
            "Hi, I'm Beer & Johnston. I guided two ME batches through Statics & Dynamics.",
            json.dumps(["Formula sheet bookmark"]), 1, "Blue Hardcover",
            "11th SI Ed", "ME", "Sem 2", "Clean pages with light pencil marginalia.",
            "USR-04", None, None, 0, "available",
            "2026-11-22T10:05:00Z"
        ),
        (
            "LST-109", "Formal Blazer + Kurta (Farewell Ready)", "Hostel Items", "Room Essentials",
            "Like New", "Like New", 0.5, 2400, 1650, None, 1, 1680, 1500, 1850, 220, 600,
            "rent", json.dumps(["rent", "sale"]), "",
            json.dumps([]), 0, 1, 5, "Hostel C Room 114", "Return dry-cleaned or steamed",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=30)).strftime("%Y-%m-%d"),
            "I'm only visiting your desk for a week! Look sharp at the event and bring me back clean.", "☕",
            "Dry-cleaned slim fit blazer & sage kurta combo worn once at Farewell.",
            "Hey! I'm a stage-ready blazer set. Zero creases, ready for Farewell photos.",
            json.dumps(["Garment cover", "Pocket square"]), 0, "Sage & Charcoal",
            "Size M (38)", "All", "All", "Pickup from Hostel C Room 114.",
            "USR-05", "EVT-03", None, 0, "available",
            "2026-11-21T17:40:00Z"
        ),
        (
            "LST-110", "6-Socket Surge Extension + Laptop Stand", "Hostel Items", "Desk Setup",
            "Good", "Well Loved", 1.0, 1450, 820, 750, 1, 830, 740, 910, 90, 250,
            "swap", json.dumps(["swap", "sale", "rent"]), "Wireless Mouse or Desk Lamp",
            json.dumps(["Electronics", "Hostel Items"]), 1, None, None, "Innovation Centre Lobby", "",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=25)).strftime("%Y-%m-%d"),
            "Trade me fairly! After one year of campus duty in good shape, I'm ready for a swap.", "☕",
            "2-meter heavy duty cord + foldable 6-angle aluminum laptop stand.",
            "Hi! I keep cables tidy and laptops cool during 24-hour Hackathon sprints.",
            json.dumps(["Velcro cable tie", "Carry sleeve"]), 0, "Silver & Black",
            "Bundle Kit", "CSE", "Sem 1", "Tagged for the 24h Campus Hackathon!",
            "USR-07", "EVT-02", None, 1, "available",
            "2026-11-21T09:15:00Z"
        ),
        (
            "LST-111", "White Cotton Chemistry Lab Coat (Size M)", "Lab Gear", "Lab Wear",
            "Like New", "Like New", 1.0, 520, 0, None, 0, 280, 240, 320, 0, 0,
            "borrow", json.dumps(["borrow"]), "",
            json.dumps([]), 0, 1, 7, "Chemistry Block Locker 4", "Wash & fold before returning after lab exam",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=30)).strftime("%Y-%m-%d"),
            "Borrow me for free on campus! I've held up great over one year—just bring me back when you're done.", "🧪",
            "Crisp cotton lab apron/coat with zero acid stains. Lending free for end-sem practicals.",
            "Hi! Free campus lend for practical week—wash me and pass me back!",
            json.dumps(["Safety goggles"]), 0, "Crisp White",
            "Size M", "All", "Sem 1", "Meet outside Chemistry Block 10 mins before lab.",
            "USR-10", "EVT-04", None, 0, "available",
            "2026-11-25T08:10:00Z"
        ),
        (
            "LST-112", "Arduino Uno + Jumper & Breadboard Kit", "Electronics", "Adapters",
            "Good", "Well Loved", 1.5, 1650, 0, None, 0, 810, 720, 900, 0, 200,
            "borrow", json.dumps(["borrow"]), "",
            json.dumps([]), 0, 2, 10, "Robotics Club Cupboard", "Refundable ₹200 deposit returned on sensor check",
            today.strftime("%Y-%m-%d"), (today + timedelta(days=40)).strftime("%Y-%m-%d"),
            "Borrow me for free on campus! I've held up great over 1.5 years—just bring me back when you're done.", "🔋",
            "Complete Arduino Uno R3 + ultrasonic sensor + 400-pin breadboard for short hackathon sprints.",
            "Free campus lend for Hackathon or Techfest builds! Don't fry my 5V regulator.",
            json.dumps(["USB-B cable", "40 jumper wires"]), 0, "Teal PCB",
            "Rev 3 Kit", "ECE", "Sem 4", "Deposit ₹200 refunded immediately on return.",
            "USR-16", "EVT-02", None, 0, "available",
            "2026-11-25T07:45:00Z"
        ),
    ]

    cur.executemany(
        """
        INSERT INTO listings (
            id, title, category, subcategory, condition, condition_sticker, age_years,
            original_price, asking_price, min_acceptable_price, negotiable,
            suggested_price, quick_sale_price, patient_price, rent_per_week, suggested_deposit,
            transaction_type, listing_types, swap_for, swap_categories, swap_multi_ok,
            borrow_min_days, borrow_max_days, collection_location, borrow_conditions,
            available_from, available_until, mascot_text, mascot_icon,
            description, monologue, addons, handwritten_notes, color, edition, branch, semester, custom_note,
            seller_id, event_id, leaving_campus_date, allow_bidding, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        active_listings,
    )

    # Competing bids on Casio & Cycle
    cur.executemany(
        "INSERT INTO bids (id, listing_id, bidder_id, amount, created_at) VALUES (?, ?, ?, ?, ?)",
        [
            ("BID-01", "LST-101", "USR-19", 750, "20 mins ago"),
            ("BID-02", "LST-101", "USR-27", 780, "7 mins ago"),
            ("BID-03", "LST-102", "USR-37", 3650, "40 mins ago"),
            ("BID-04", "LST-102", "USR-22", 3750, "12 mins ago"),
        ],
    )

    # Sample counter-offer for haggling flow
    cur.execute(
        """
        INSERT INTO counter_offers (id, listing_id, buyer_id, offer_amount, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        ("CO-01", "LST-103", "USR-28", 540, "Can pick up near Library at 5 PM today!", "pending", "1 hour ago"),
    )

    # Sample swaps & rentals for My Trades
    cur.execute(
        """
        INSERT INTO swaps (id, listing_id, proposer_id, offered_item, offered_value, target_value, value_balance_diff, balance_text, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("SWP-01", "LST-101", "USR-14", "Strength of Materials + Lab Apron", 660, 740, -80, "You owe ₹80", "pending", "3 hours ago"),
    )

    cur.execute(
        """
        INSERT INTO rentals (id, listing_id, renter_id, start_date, end_date, weekly_rate, deposit, total_rent, status, return_timeliness, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("RNT-01", "LST-104", "USR-20", "2026-11-26", "2026-12-03", 180, 500, 180, "active", None, "2 hours ago"),
    )

    # Needs / Wanted Board
    cur.executemany(
        """
        INSERT INTO needs (id, title, category, branch, semester, max_budget, requester_id, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            ("NEED-01", "Casio fx-991EX or fx-991CW Scientific Calculator", "Calculators", "ME", "Sem 3", 800, "USR-28", "Need before mid-sem quiz next week!", "2026-11-24T08:00:00Z"),
            ("NEED-02", "Sedra & Smith Microelectronic Circuits", "Books", "ECE", "Sem 4", 450, "USR-24", "Any condition works as long as chapters are intact.", "2026-11-24T06:00:00Z"),
            ("NEED-03", "20000mAh Power Bank for Hackathon", "Electronics", "CSE", "Sem 2", 2000, "USR-37", "Happy to rent for the weekend or buy!", "2026-11-23T19:00:00Z"),
        ],
    )

    # Initial notification
    cur.execute(
        """
        INSERT INTO notifications (id, type, title, message, listing_id, need_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "NTF-01",
            "need_match",
            "Match Ready for Calculator Need",
            "PixelPanda listed Casio fx-991EX ClassWiz (₹740) matching an active Need under ₹800.",
            "LST-101",
            "NEED-01",
            0,
            "Just now",
        ),
    )

    # Lost & Found
    cur.executemany(
        """
        INSERT INTO lost_found (id, post_type, title, location, description, poster_name, contact_note, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            ("LF-01", "found", "Casio fx-82MS with blue tape on back", "Lecture Theatre 3", "Left after morning Thermodynamics quiz.", "Gearhead26", "Hostel B Room 309", "open", "2 hours ago"),
            ("LF-02", "lost", "Silver Cycle Key on green lanyard", "Central Library Stand", "Dropped near the water cooler around 11:30 AM.", "VeloRider", "Girls Hostel 1 Desk", "open", "5 hours ago"),
            ("LF-03", "found", "White Lab Coat (Size M)", "Chemistry Lab Corridor", "Folded near locker 14.", "LabCoatLeo", "SAC Counter", "reunited", "Yesterday"),
        ],
    )

    conn.commit()


def generate_insights(records: list[dict]) -> dict:
    by_cat = {}
    for cat in CATEGORIES:
        rows = [r for r in records if r["category"] == cat]
        avg_ret = round(sum(r["retention_pct"] for r in rows) / len(rows))
        y1 = [r["retention_pct"] for r in rows if r["age_years"] == 1.0]
        avg_y1 = round(sum(y1) / len(y1)) if y1 else avg_ret

        like_new = [r["retention_pct"] for r in rows if r["condition"] == "Like New"]
        worn = [r["retention_pct"] for r in rows if r["condition"] == "Worn"]
        cond_spread = (round(sum(like_new) / len(like_new)) if like_new else 0) - (
            round(sum(worn) / len(worn)) if worn else 0
        )

        by_cat[cat] = {
            "count": len(rows),
            "avg_retention_pct": avg_ret,
            "year_1_retention_pct": avg_y1,
            "condition_spread_pct": cond_spread,
        }

    peak_rows = [r["retention_pct"] for r in records if r["month_sold"] in (7, 8, 12, 1)]
    dip_rows = [r["retention_pct"] for r in records if r["month_sold"] == 5]
    peak_avg = round(sum(peak_rows) / len(peak_rows))
    dip_avg = round(sum(dip_rows) / len(dip_rows))

    findings = [
        {
            "title": "Calculators hold value while Books drop steepest in Year 1",
            "metric": f"{by_cat['Calculators']['avg_retention_pct']}% vs {by_cat['Books']['year_1_retention_pct']}%",
            "detail": (
                f"Across 200 seeded sales (seed 42), Calculators retain {by_cat['Calculators']['avg_retention_pct']}% "
                f"of MRP on average because exam models stay identical, whereas Books fall to "
                f"{by_cat['Books']['year_1_retention_pct']}% in Year 1 alone as editions shift."
            ),
        },
        {
            "title": "Cycles care about Condition far more than Age",
            "metric": f"{by_cat['Cycles']['condition_spread_pct']} pt gap",
            "detail": (
                f"For Cycles, the resale gap between Like New and Worn is {by_cat['Cycles']['condition_spread_pct']} "
                f"percentage points of MRP—making brake/tire upkeep worth more than buying a newer year."
            ),
        },
        {
            "title": "Semester-start timing adds ~10–15% to resale price",
            "metric": f"{peak_avg}% peak vs {dip_avg}% May dip",
            "detail": (
                f"Items sold during Jul–Aug or Dec–Jan semester rush clear at {peak_avg}% average MRP retention, "
                f"compared to {dip_avg}% during the May move-out slump."
            ),
        },
    ]

    summary = {
        "seed": 42,
        "total_past_sales": len(records),
        "category_summary": by_cat,
        "seasonality": {"peak_avg_pct": peak_avg, "may_dip_pct": dip_avg},
        "findings": findings,
    }

    with open(INSIGHTS_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    return summary


def seed_all() -> None:
    conn = sqlite3.connect(DB_PATH)
    create_schema(conn)
    records = seed_past_sales(conn)
    users = seed_users(conn)
    seed_events(conn)
    seed_live_marketplace(conn)
    insights = generate_insights(records)
    conn.close()
    print(
        f"Seeded {len(records)} past sales, {len(users)} users, 5 events, and 12 active listings into {DB_PATH}."
    )
    print("Top pitch finding:", insights["findings"][0]["title"])


if __name__ == "__main__":
    seed_all()
