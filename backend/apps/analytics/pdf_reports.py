"""
PDF Report Generation for SalusLogica
Generates professional PDF reports for:
- Medication list
- Dose history
- Adherence statistics
- Full combined report
"""

import io
import os
from datetime import datetime, timedelta
from decimal import Decimal

from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Avg, Sum, Count, Q

from apps.medicines.models import Medicine
from apps.doses.models import DoseLog, DoseHistory
from .models import AdherenceReport, DashboardStats

User = get_user_model()


# ───────────────────── colour palette ─────────────────────
TEAL = (13, 148, 136)         # brand primary
TEAL_DARK = (15, 118, 110)
TEAL_LIGHT = (204, 251, 241)
WHITE = (255, 255, 255)
GRAY_50 = (249, 250, 251)
GRAY_100 = (243, 244, 246)
GRAY_200 = (229, 231, 235)
GRAY_600 = (75, 85, 99)
GRAY_800 = (31, 41, 55)
GREEN = (34, 197, 94)
AMBER = (245, 158, 11)
RED = (239, 68, 68)


def _rgb(color):
    """Convert 0-255 RGB tuple to 0-1 float tuple for reportlab."""
    return tuple(c / 255 for c in color)


def _adherence_color(pct):
    """Return colour based on adherence percentage."""
    if pct >= 90:
        return _rgb(GREEN)
    elif pct >= 70:
        return _rgb(AMBER)
    return _rgb(RED)


# ─────────────────────── helpers ───────────────────────────

def _draw_header(c, width, height, title, subtitle, user, generated_at):
    """Draw report header banner."""
    # Teal banner
    c.setFillColorRGB(*_rgb(TEAL))
    c.rect(0, height - 100, width, 100, fill=1, stroke=0)

    # Title text
    c.setFillColorRGB(*_rgb(WHITE))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(40, height - 45, title)

    c.setFont("Helvetica", 11)
    c.drawString(40, height - 65, subtitle)

    # Right side – user info
    c.setFont("Helvetica", 9)
    c.drawRightString(width - 40, height - 35, f"Patient: {user.get_full_name() or user.username}")
    c.drawRightString(width - 40, height - 50, f"Generated: {generated_at.strftime('%B %d, %Y at %H:%M')}")
    c.drawRightString(width - 40, height - 65, "SalusLogica – MedAlert")


def _draw_footer(c, width, page_num):
    """Draw page footer."""
    c.setFillColorRGB(*_rgb(GRAY_200))
    c.rect(0, 0, width, 30, fill=1, stroke=0)
    c.setFillColorRGB(*_rgb(GRAY_600))
    c.setFont("Helvetica", 8)
    c.drawString(40, 10, "SalusLogica – Confidential Medical Report")
    c.drawRightString(width - 40, 10, f"Page {page_num}")


def _section_title(c, y, text, width):
    """Draw a section heading with underline."""
    c.setFillColorRGB(*_rgb(TEAL_DARK))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, text)
    c.setStrokeColorRGB(*_rgb(TEAL_LIGHT))
    c.setLineWidth(1.5)
    c.line(40, y - 5, width - 40, y - 5)
    return y - 25


def _check_page_break(c, y, width, height, page_num, min_y=80):
    """Add a new page if we're running out of space."""
    if y < min_y:
        _draw_footer(c, width, page_num[0])
        c.showPage()
        page_num[0] += 1
        y = height - 50
    return y


# ──────────────── MEDICINE LIST REPORT ─────────────────────

def generate_medicine_list_pdf(user, parameters=None):
    """Generate a PDF listing all user's medicines."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    width, height = A4
    c = canvas.Canvas(buf, pagesize=A4)
    now = timezone.now()
    page_num = [1]

    medicines = Medicine.objects.filter(user=user).order_by('-is_active', 'name')

    _draw_header(c, width, height, "Medication List Report",
                 f"{medicines.count()} medications on record", user, now)

    y = height - 130

    # Summary box
    active = medicines.filter(is_active=True, completed=False).count()
    completed = medicines.filter(completed=True).count()
    inactive = medicines.filter(is_active=False).count()

    c.setFillColorRGB(*_rgb(GRAY_50))
    c.roundRect(40, y - 55, width - 80, 55, 6, fill=1, stroke=0)
    c.setFillColorRGB(*_rgb(GRAY_800))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(55, y - 18, f"Active: {active}")
    c.drawString(200, y - 18, f"Completed: {completed}")
    c.drawString(370, y - 18, f"Inactive: {inactive}")
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(*_rgb(GRAY_600))
    c.drawString(55, y - 38, f"Total medications: {medicines.count()}")

    y -= 80

    # Table header
    col_x = [40, 170, 260, 340, 410, 500]
    headers = ["Medicine", "Dosage", "Frequency", "Start", "End", "Status"]

    c.setFillColorRGB(*_rgb(TEAL))
    c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)
    c.setFillColorRGB(*_rgb(WHITE))
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(col_x[i] + 5, y, h)
    y -= 25

    # Rows
    for idx, med in enumerate(medicines):
        y = _check_page_break(c, y, width, height, page_num)

        if idx % 2 == 0:
            c.setFillColorRGB(*_rgb(GRAY_50))
            c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)

        c.setFillColorRGB(*_rgb(GRAY_800))
        c.setFont("Helvetica", 9)
        c.drawString(col_x[0] + 5, y, med.name[:20])
        c.drawString(col_x[1] + 5, y, str(med.dosage)[:15])
        c.drawString(col_x[2] + 5, y, med.get_frequency_display()[:12])
        c.drawString(col_x[3] + 5, y, med.start_date.strftime('%Y-%m-%d') if med.start_date else '-')
        c.drawString(col_x[4] + 5, y, med.end_date.strftime('%Y-%m-%d') if med.end_date else '-')

        status = "Active" if med.is_active and not med.completed else ("Done" if med.completed else "Inactive")
        sc = GREEN if status == "Active" else (AMBER if status == "Done" else RED)
        c.setFillColorRGB(*_rgb(sc))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_x[5] + 5, y, status)

        y -= 20

        # Extra detail row (instructions/doctor)
        extras = []
        if med.prescribing_doctor:
            extras.append(f"Doctor: {med.prescribing_doctor}")
        if med.instructions:
            extras.append(f"Instructions: {med.instructions[:60]}")
        if med.notes:
            extras.append(f"Notes: {med.notes[:60]}")
        if extras:
            y = _check_page_break(c, y, width, height, page_num)
            c.setFillColorRGB(*_rgb(GRAY_600))
            c.setFont("Helvetica-Oblique", 8)
            c.drawString(col_x[0] + 15, y, " | ".join(extras)[:90])
            y -= 15

    _draw_footer(c, width, page_num[0])
    c.save()
    buf.seek(0)
    return buf


# ──────────────── DOSE HISTORY REPORT ──────────────────────

def generate_dose_history_pdf(user, parameters=None):
    """Generate a PDF with dose history details."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    params = parameters or {}
    days = int(params.get('days', 30))
    start_date = timezone.now().date() - timedelta(days=days)

    buf = io.BytesIO()
    width, height = A4
    c = canvas.Canvas(buf, pagesize=A4)
    now = timezone.now()
    page_num = [1]

    doses = (DoseLog.objects
             .filter(medicine__user=user, scheduled_time__date__gte=start_date)
             .select_related('medicine')
             .order_by('-scheduled_time'))

    _draw_header(c, width, height, "Dose History Report",
                 f"Last {days} days – {doses.count()} dose records", user, now)

    y = height - 130

    # Summary stats
    total = doses.count()
    taken = doses.filter(status='taken').count()
    missed = doses.filter(status='missed').count()
    snoozed = doses.filter(status='snoozed').count()
    pending = doses.filter(status='pending').count()
    adherence_pct = (taken / total * 100) if total > 0 else 0

    c.setFillColorRGB(*_rgb(GRAY_50))
    c.roundRect(40, y - 55, width - 80, 55, 6, fill=1, stroke=0)
    c.setFillColorRGB(*_rgb(GRAY_800))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(55, y - 18, f"Taken: {taken}")
    c.drawString(155, y - 18, f"Missed: {missed}")
    c.drawString(255, y - 18, f"Snoozed: {snoozed}")
    c.drawString(370, y - 18, f"Pending: {pending}")
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(*_rgb(GRAY_600))
    c.drawString(55, y - 38, f"Overall adherence: {adherence_pct:.1f}%")
    c.drawString(250, y - 38, f"Period: {start_date} → {now.date()}")

    y -= 80

    # Table header
    col_x = [40, 165, 285, 370, 460]
    headers = ["Medicine", "Scheduled", "Status", "Taken At", "Notes"]

    c.setFillColorRGB(*_rgb(TEAL))
    c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)
    c.setFillColorRGB(*_rgb(WHITE))
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(col_x[i] + 5, y, h)
    y -= 25

    for idx, dose in enumerate(doses[:200]):  # limit to 200 records
        y = _check_page_break(c, y, width, height, page_num)

        if idx % 2 == 0:
            c.setFillColorRGB(*_rgb(GRAY_50))
            c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)

        c.setFillColorRGB(*_rgb(GRAY_800))
        c.setFont("Helvetica", 9)
        c.drawString(col_x[0] + 5, y, dose.medicine.name[:20])
        c.drawString(col_x[1] + 5, y, dose.scheduled_time.strftime('%Y-%m-%d %H:%M'))

        status_colors = {'taken': GREEN, 'missed': RED, 'snoozed': AMBER, 'pending': GRAY_600}
        sc = status_colors.get(dose.status, GRAY_600)
        c.setFillColorRGB(*_rgb(sc))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_x[2] + 5, y, dose.status.capitalize())

        c.setFillColorRGB(*_rgb(GRAY_800))
        c.setFont("Helvetica", 9)
        c.drawString(col_x[3] + 5, y, dose.taken_at.strftime('%H:%M') if dose.taken_at else '-')
        c.drawString(col_x[4] + 5, y, (dose.notes or '-')[:20])

        y -= 20

    _draw_footer(c, width, page_num[0])
    c.save()
    buf.seek(0)
    return buf


# ──────────────── ADHERENCE REPORT ─────────────────────────

def generate_adherence_pdf(user, parameters=None):
    """Generate a PDF with adherence statistics and trends."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    params = parameters or {}
    days = int(params.get('days', 30))
    start_date = timezone.now().date() - timedelta(days=days)

    buf = io.BytesIO()
    width, height = A4
    c = canvas.Canvas(buf, pagesize=A4)
    now = timezone.now()
    page_num = [1]

    history = (DoseHistory.objects
               .filter(user=user, date__gte=start_date)
               .select_related('medicine')
               .order_by('-date'))

    _draw_header(c, width, height, "Adherence Statistics Report",
                 f"Last {days} days – adherence analysis", user, now)

    y = height - 130

    # Overall stats
    total_scheduled = history.aggregate(t=Sum('doses_scheduled'))['t'] or 0
    total_taken = history.aggregate(t=Sum('doses_taken'))['t'] or 0
    total_missed = history.aggregate(t=Sum('doses_missed'))['t'] or 0
    avg_adherence = history.aggregate(a=Avg('adherence_percentage'))['a'] or 0

    c.setFillColorRGB(*_rgb(GRAY_50))
    c.roundRect(40, y - 70, width - 80, 70, 6, fill=1, stroke=0)

    c.setFont("Helvetica-Bold", 12)
    c.setFillColorRGB(*_adherence_color(float(avg_adherence)))
    c.drawString(55, y - 20, f"Overall Adherence: {avg_adherence:.1f}%")

    c.setFillColorRGB(*_rgb(GRAY_800))
    c.setFont("Helvetica", 10)
    c.drawString(55, y - 40, f"Scheduled: {total_scheduled}")
    c.drawString(200, y - 40, f"Taken: {total_taken}")
    c.drawString(320, y - 40, f"Missed: {total_missed}")

    c.setFont("Helvetica", 9)
    c.setFillColorRGB(*_rgb(GRAY_600))
    c.drawString(55, y - 58, f"Period: {start_date} → {now.date()}")

    y -= 95

    # Per-medicine adherence
    y = _section_title(c, y, "Adherence by Medicine", width)

    medicines = Medicine.objects.filter(user=user, is_active=True)
    for med in medicines:
        y = _check_page_break(c, y, width, height, page_num)

        med_history = history.filter(medicine=med)
        med_scheduled = med_history.aggregate(t=Sum('doses_scheduled'))['t'] or 0
        med_taken = med_history.aggregate(t=Sum('doses_taken'))['t'] or 0
        med_pct = (med_taken / med_scheduled * 100) if med_scheduled > 0 else 0

        c.setFillColorRGB(*_rgb(GRAY_800))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(55, y, med.name)

        # Progress bar background
        bar_x = 220
        bar_w = 200
        bar_h = 12
        c.setFillColorRGB(*_rgb(GRAY_200))
        c.roundRect(bar_x, y - 3, bar_w, bar_h, 3, fill=1, stroke=0)

        # Progress bar fill
        fill_w = max(bar_w * (med_pct / 100), 0)
        c.setFillColorRGB(*_adherence_color(med_pct))
        if fill_w > 0:
            c.roundRect(bar_x, y - 3, fill_w, bar_h, 3, fill=1, stroke=0)

        # Percentage text
        c.setFont("Helvetica-Bold", 9)
        c.drawString(bar_x + bar_w + 10, y, f"{med_pct:.1f}%")

        # Details
        c.setFont("Helvetica", 8)
        c.setFillColorRGB(*_rgb(GRAY_600))
        c.drawString(bar_x + bar_w + 55, y, f"({med_taken}/{med_scheduled})")

        y -= 28

    # Daily breakdown (recent 14 days)
    y -= 10
    y = _check_page_break(c, y, width, height, page_num, min_y=150)
    y = _section_title(c, y, "Daily Breakdown (Last 14 Days)", width)

    recent_history = history.filter(date__gte=now.date() - timedelta(days=14)).order_by('date')

    col_x = [40, 130, 230, 320, 430]
    headers = ["Date", "Scheduled", "Taken", "Missed", "Adherence"]

    c.setFillColorRGB(*_rgb(TEAL))
    c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)
    c.setFillColorRGB(*_rgb(WHITE))
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(col_x[i] + 5, y, h)
    y -= 25

    # Aggregate by date
    from django.db.models.functions import TruncDate
    daily = (recent_history
             .values('date')
             .annotate(
                 sched=Sum('doses_scheduled'),
                 taken=Sum('doses_taken'),
                 missed=Sum('doses_missed'),
                 avg_adh=Avg('adherence_percentage'))
             .order_by('date'))

    for idx, day in enumerate(daily):
        y = _check_page_break(c, y, width, height, page_num)

        if idx % 2 == 0:
            c.setFillColorRGB(*_rgb(GRAY_50))
            c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)

        c.setFillColorRGB(*_rgb(GRAY_800))
        c.setFont("Helvetica", 9)
        c.drawString(col_x[0] + 5, y, str(day['date']))
        c.drawString(col_x[1] + 5, y, str(day['sched']))
        c.drawString(col_x[2] + 5, y, str(day['taken']))
        c.drawString(col_x[3] + 5, y, str(day['missed']))

        adh = float(day['avg_adh'] or 0)
        c.setFillColorRGB(*_adherence_color(adh))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_x[4] + 5, y, f"{adh:.1f}%")

        y -= 20

    _draw_footer(c, width, page_num[0])
    c.save()
    buf.seek(0)
    return buf


# ──────────────── FULL COMBINED REPORT ─────────────────────

def generate_full_report_pdf(user, parameters=None):
    """Generate a comprehensive PDF combining all report types."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    params = parameters or {}
    days = int(params.get('days', 30))
    start_date = timezone.now().date() - timedelta(days=days)

    buf = io.BytesIO()
    width, height = A4
    c = canvas.Canvas(buf, pagesize=A4)
    now = timezone.now()
    page_num = [1]

    medicines = Medicine.objects.filter(user=user).order_by('-is_active', 'name')
    doses = (DoseLog.objects
             .filter(medicine__user=user, scheduled_time__date__gte=start_date)
             .select_related('medicine'))
    history = (DoseHistory.objects
               .filter(user=user, date__gte=start_date)
               .select_related('medicine'))

    _draw_header(c, width, height, "Complete Health Report",
                 f"Comprehensive medication & adherence report", user, now)

    y = height - 130

    # ─── Section 1: Summary Dashboard ───
    y = _section_title(c, y, "Summary Overview", width)

    active_meds = medicines.filter(is_active=True, completed=False).count()
    total_doses = doses.count()
    taken_doses = doses.filter(status='taken').count()
    missed_doses = doses.filter(status='missed').count()
    overall_adh = (taken_doses / total_doses * 100) if total_doses > 0 else 0

    # Stats boxes
    box_w = (width - 100) / 3
    stats = [
        (f"{active_meds}", "Active Medicines", TEAL),
        (f"{overall_adh:.1f}%", "Adherence Rate", GREEN if overall_adh >= 80 else AMBER),
        (f"{missed_doses}", "Missed Doses", RED if missed_doses > 5 else AMBER),
    ]
    for i, (val, label, color) in enumerate(stats):
        bx = 40 + i * (box_w + 10)
        c.setFillColorRGB(*_rgb(color))
        c.roundRect(bx, y - 50, box_w, 50, 6, fill=1, stroke=0)
        c.setFillColorRGB(*_rgb(WHITE))
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(bx + box_w / 2, y - 22, val)
        c.setFont("Helvetica", 9)
        c.drawCentredString(bx + box_w / 2, y - 40, label)

    y -= 75

    # ─── Section 2: Medication List ───
    y = _check_page_break(c, y, width, height, page_num, min_y=120)
    y = _section_title(c, y, "Current Medications", width)

    col_x = [40, 180, 280, 360, 450]
    headers = ["Medicine", "Dosage", "Frequency", "Dates", "Status"]

    c.setFillColorRGB(*_rgb(TEAL))
    c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)
    c.setFillColorRGB(*_rgb(WHITE))
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(col_x[i] + 5, y, h)
    y -= 25

    for idx, med in enumerate(medicines[:30]):
        y = _check_page_break(c, y, width, height, page_num)

        if idx % 2 == 0:
            c.setFillColorRGB(*_rgb(GRAY_50))
            c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)

        c.setFillColorRGB(*_rgb(GRAY_800))
        c.setFont("Helvetica", 9)
        c.drawString(col_x[0] + 5, y, med.name[:22])
        c.drawString(col_x[1] + 5, y, str(med.dosage)[:15])
        c.drawString(col_x[2] + 5, y, med.get_frequency_display()[:14])
        dates = f"{med.start_date.strftime('%m/%d')}-{med.end_date.strftime('%m/%d')}" if med.start_date and med.end_date else '-'
        c.drawString(col_x[3] + 5, y, dates)

        status = "Active" if med.is_active and not med.completed else ("Done" if med.completed else "Off")
        sc = GREEN if status == "Active" else (AMBER if status == "Done" else RED)
        c.setFillColorRGB(*_rgb(sc))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_x[4] + 5, y, status)
        y -= 20

    # ─── Section 3: Adherence by Medicine ───
    y -= 10
    y = _check_page_break(c, y, width, height, page_num, min_y=120)
    y = _section_title(c, y, "Adherence by Medicine", width)

    active_medicines = medicines.filter(is_active=True)
    for med in active_medicines[:15]:
        y = _check_page_break(c, y, width, height, page_num)

        med_doses = doses.filter(medicine=med)
        med_total = med_doses.count()
        med_taken = med_doses.filter(status='taken').count()
        med_pct = (med_taken / med_total * 100) if med_total > 0 else 0

        c.setFillColorRGB(*_rgb(GRAY_800))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(55, y, med.name[:25])

        bar_x = 230
        bar_w = 180
        bar_h = 12
        c.setFillColorRGB(*_rgb(GRAY_200))
        c.roundRect(bar_x, y - 3, bar_w, bar_h, 3, fill=1, stroke=0)
        fill_w = max(bar_w * (med_pct / 100), 0)
        c.setFillColorRGB(*_adherence_color(med_pct))
        if fill_w > 0:
            c.roundRect(bar_x, y - 3, fill_w, bar_h, 3, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(bar_x + bar_w + 10, y, f"{med_pct:.1f}%")

        y -= 25

    # ─── Section 4: Recent Dose Log (last 7 days) ───
    y -= 10
    y = _check_page_break(c, y, width, height, page_num, min_y=120)
    y = _section_title(c, y, "Recent Dose Log (Last 7 Days)", width)

    recent_doses = doses.filter(
        scheduled_time__date__gte=now.date() - timedelta(days=7)
    ).order_by('-scheduled_time')[:50]

    col_x = [40, 165, 295, 380, 470]
    headers = ["Medicine", "Scheduled", "Status", "Taken At", "Notes"]
    c.setFillColorRGB(*_rgb(TEAL))
    c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)
    c.setFillColorRGB(*_rgb(WHITE))
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(col_x[i] + 5, y, h)
    y -= 25

    for idx, dose in enumerate(recent_doses):
        y = _check_page_break(c, y, width, height, page_num)
        if idx % 2 == 0:
            c.setFillColorRGB(*_rgb(GRAY_50))
            c.rect(40, y - 5, width - 80, 20, fill=1, stroke=0)

        c.setFillColorRGB(*_rgb(GRAY_800))
        c.setFont("Helvetica", 9)
        c.drawString(col_x[0] + 5, y, dose.medicine.name[:20])
        c.drawString(col_x[1] + 5, y, dose.scheduled_time.strftime('%m/%d %H:%M'))

        status_colors = {'taken': GREEN, 'missed': RED, 'snoozed': AMBER, 'pending': GRAY_600}
        sc = status_colors.get(dose.status, GRAY_600)
        c.setFillColorRGB(*_rgb(sc))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_x[2] + 5, y, dose.status.capitalize())

        c.setFillColorRGB(*_rgb(GRAY_800))
        c.setFont("Helvetica", 9)
        c.drawString(col_x[3] + 5, y, dose.taken_at.strftime('%H:%M') if dose.taken_at else '-')
        c.drawString(col_x[4] + 5, y, (dose.notes or '-')[:15])
        y -= 20

    # Disclaimer
    y -= 20
    y = _check_page_break(c, y, width, height, page_num, min_y=60)
    c.setFillColorRGB(*_rgb(GRAY_600))
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(40, y, "This report is generated automatically and is intended for informational purposes only.")
    c.drawString(40, y - 12, "Always consult your healthcare provider for medical advice.")

    _draw_footer(c, width, page_num[0])
    c.save()
    buf.seek(0)
    return buf


# ────────────── DISPATCHER ─────────────────────────────────

REPORT_GENERATORS = {
    'medicine_list': generate_medicine_list_pdf,
    'dose_history': generate_dose_history_pdf,
    'adherence_report': generate_adherence_pdf,
    'full_report': generate_full_report_pdf,
}


def generate_pdf_report(user, report_type, parameters=None):
    """
    Main entry point.  Returns an io.BytesIO containing the PDF.
    Raises ValueError if report_type is unknown.
    """
    generator = REPORT_GENERATORS.get(report_type)
    if not generator:
        raise ValueError(f"Unknown report type: {report_type}. "
                         f"Choose from: {', '.join(REPORT_GENERATORS.keys())}")
    return generator(user, parameters)
