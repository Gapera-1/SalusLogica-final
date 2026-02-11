from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
import csv
import json
from django.core.files.base import ContentFile
from django.conf import settings

from .models import DashboardStats, AdherenceReport, MedicineUsageStats, ExportRequest
from apps.medicines.models import Medicine
from apps.doses.models import DoseLog, DoseHistory

User = get_user_model()


@shared_task
def update_dashboard_stats():
    """Update dashboard statistics for all users"""
    from django.db.models import Avg, Count, Q
    
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    
    for user in User.objects.all():
        # Calculate stats
        total_medicines = Medicine.objects.filter(user=user).count()
        active_medicines = Medicine.objects.filter(user=user, is_active=True, completed=False).count()
        
        # Today's doses
        today_doses = DoseLog.objects.filter(
            medicine__user=user,
            scheduled_time__date=today
        )
        doses_today = today_doses.count()
        doses_taken_today = today_doses.filter(status='taken').count()
        
        # This week's missed doses
        missed_doses_week = DoseLog.objects.filter(
            medicine__user=user,
            scheduled_time__date__gte=week_ago,
            status='missed'
        ).count()
        
        # Overall adherence rate (last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        recent_history = DoseHistory.objects.filter(
            user=user,
            date__gte=thirty_days_ago
        )
        
        adherence_rate = 0
        if recent_history.exists():
            total_scheduled = recent_history.aggregate(total=models.Sum('doses_scheduled'))['total'] or 0
            total_taken = recent_history.aggregate(total=models.Sum('doses_taken'))['total'] or 0
            if total_scheduled > 0:
                adherence_rate = (total_taken / total_scheduled) * 100
        
        # Calculate streak (consecutive days with good adherence)
        streak_days = calculate_adherence_streak(user)
        
        # Update or create dashboard stats
        stats, created = DashboardStats.objects.update_or_create(
            user=user,
            defaults={
                'total_medicines': total_medicines,
                'active_medicines': active_medicines,
                'doses_today': doses_today,
                'doses_taken_today': doses_taken_today,
                'adherence_rate': adherence_rate,
                'missed_doses_week': missed_doses_week,
                'streak_days': streak_days,
            }
        )


def calculate_adherence_streak(user):
    """Calculate consecutive days with 80%+ adherence"""
    streak = 0
    current_date = timezone.now().date() - timedelta(days=1)  # Start from yesterday
    
    while True:
        history = DoseHistory.objects.filter(
            user=user,
            date=current_date
        ).first()
        
        if history and history.adherence_percentage >= 80:
            streak += 1
            current_date -= timedelta(days=1)
        else:
            break
    
    return streak


@shared_task
def generate_adherence_reports():
    """Generate weekly and monthly adherence reports"""
    today = timezone.now().date()
    
    # Weekly reports
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    # Monthly reports
    month_start = today.replace(day=1)
    if today.month == 12:
        month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    
    for user in User.objects.all():
        # Generate weekly report
        generate_period_report(user, 'weekly', week_start, week_end)
        
        # Generate monthly report
        generate_period_report(user, 'monthly', month_start, month_end)


def generate_period_report(user, period, start_date, end_date):
    """Generate adherence report for a specific period"""
    # Overall report
    history = DoseHistory.objects.filter(
        user=user,
        date__gte=start_date,
        date__lte=end_date
    )
    
    total_scheduled = history.aggregate(total=models.Sum('doses_scheduled'))['total'] or 0
    total_taken = history.aggregate(total=models.Sum('doses_taken'))['total'] or 0
    total_missed = history.aggregate(total=models.Sum('doses_missed'))['total'] or 0
    
    adherence_percentage = (total_taken / total_scheduled * 100) if total_scheduled > 0 else 0
    
    AdherenceReport.objects.update_or_create(
        user=user,
        medicine=None,  # Overall report
        period=period,
        start_date=start_date,
        end_date=end_date,
        defaults={
            'doses_scheduled': total_scheduled,
            'doses_taken': total_taken,
            'doses_missed': total_missed,
            'adherence_percentage': adherence_percentage,
        }
    )
    
    # Per-medicine reports
    medicines = Medicine.objects.filter(user=user)
    for medicine in medicines:
        medicine_history = history.filter(medicine=medicine)
        
        med_scheduled = medicine_history.aggregate(total=models.Sum('doses_scheduled'))['total'] or 0
        med_taken = medicine_history.aggregate(total=models.Sum('doses_taken'))['total'] or 0
        med_missed = medicine_history.aggregate(total=models.Sum('doses_missed'))['total'] or 0
        
        med_adherence = (med_taken / med_scheduled * 100) if med_scheduled > 0 else 0
        
        AdherenceReport.objects.update_or_create(
            user=user,
            medicine=medicine,
            period=period,
            start_date=start_date,
            end_date=end_date,
            defaults={
                'doses_scheduled': med_scheduled,
                'doses_taken': med_taken,
                'doses_missed': med_missed,
                'adherence_percentage': med_adherence,
            }
        )


@shared_task
def process_export_request(export_request_id):
    """Process an export request"""
    try:
        export_request = ExportRequest.objects.get(id=export_request_id)
        export_request.status = 'processing'
        export_request.save()
        
        user = export_request.user
        export_type = export_request.export_type
        parameters = export_request.parameters
        
        # Generate export data
        if export_type == 'adherence_report':
            data = generate_adherence_export(user, parameters)
        elif export_type == 'medicine_list':
            data = generate_medicine_list_export(user, parameters)
        elif export_type == 'dose_history':
            data = generate_dose_history_export(user, parameters)
        elif export_type == 'full_data':
            data = generate_full_data_export(user, parameters)
        else:
            raise ValueError(f"Unknown export type: {export_type}")
        
        # Create CSV file
        filename = f"export_{export_type}_{user.username}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        file_path = f"exports/{filename}"
        
        # Save file (in production, use cloud storage)
        content = generate_csv_content(data)
        
        export_request.file_path = file_path
        export_request.status = 'completed'
        export_request.completed_at = timezone.now()
        export_request.save()
        
        return f"Export completed: {filename}"
        
    except Exception as e:
        export_request.status = 'failed'
        export_request.error_message = str(e)
        export_request.save()
        raise


def generate_adherence_export(user, parameters):
    """Generate adherence report export data"""
    start_date = parameters.get('start_date')
    end_date = parameters.get('end_date')
    
    history = DoseHistory.objects.filter(user=user)
    
    if start_date:
        history = history.filter(date__gte=start_date)
    if end_date:
        history = history.filter(date__lte=end_date)
    
    data = []
    for record in history.select_related('medicine'):
        data.append({
            'Date': record.date,
            'Medicine': record.medicine.name,
            'Doses Scheduled': record.doses_scheduled,
            'Doses Taken': record.doses_taken,
            'Doses Missed': record.doses_missed,
            'Adherence %': record.adherence_percentage,
        })
    
    return data


def generate_medicine_list_export(user, parameters):
    """Generate medicine list export data"""
    medicines = Medicine.objects.filter(user=user)
    
    data = []
    for medicine in medicines:
        data.append({
            'Name': medicine.name,
            'Dosage': medicine.dosage,
            'Frequency': medicine.get_frequency_display(),
            'Start Date': medicine.start_date,
            'End Date': medicine.end_date,
            'Is Active': medicine.is_active,
            'Completed': medicine.completed,
            'Stock Count': medicine.stock_count,
            'Prescribed For': medicine.prescribed_for,
            'Prescribing Doctor': medicine.prescribing_doctor,
        })
    
    return data


def generate_dose_history_export(user, parameters):
    """Generate dose history export data"""
    start_date = parameters.get('start_date')
    end_date = parameters.get('end_date')
    
    doses = DoseLog.objects.filter(medicine__user=user).select_related('medicine')
    
    if start_date:
        doses = doses.filter(scheduled_time__date__gte=start_date)
    if end_date:
        doses = doses.filter(scheduled_time__date__lte=end_date)
    
    data = []
    for dose in doses:
        data.append({
            'Medicine': dose.medicine.name,
            'Scheduled Time': dose.scheduled_time,
            'Local Time': dose.local_time,
            'Status': dose.status,
            'Taken At': dose.taken_at,
            'Snooze Count': dose.snooze_count,
            'Notes': dose.notes,
        })
    
    return data


def generate_full_data_export(user, parameters):
    """Generate full data export"""
    # Combine all exports
    data = []
    
    # Add medicine list
    data.extend(generate_medicine_list_export(user, parameters))
    
    # Add dose history
    data.extend(generate_dose_history_export(user, parameters))
    
    # Add adherence reports
    data.extend(generate_adherence_export(user, parameters))
    
    return data


def generate_csv_content(data):
    """Generate CSV content from data"""
    if not data:
        return ""
    
    import io
    output = io.StringIO()
    
    if data:
        fieldnames = data[0].keys()
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    return output.getvalue()
