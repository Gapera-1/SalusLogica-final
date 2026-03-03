"""
AI engine for SalusLogica chatbot.
Uses OpenAI GPT API to power the health-assistant chatbot.
Falls back to a rule-based engine when OPENAI_API_KEY is not set.
"""

import logging
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are SalusLogica AI, a helpful and friendly health assistant integrated into the SalusLogica medicine-reminder platform.

Your capabilities:
- Answer general health and wellness questions
- Provide information about common medications, dosages, and side effects
- Explain drug interactions in plain language
- Give advice on medication adherence and scheduling
- Offer basic first-aid and self-care guidance

Important rules:
1. You are NOT a doctor. Always remind users to consult a healthcare professional for diagnosis or treatment decisions.
2. Never prescribe medications or suggest changing prescribed dosages.
3. If a user describes a medical emergency, urge them to call emergency services immediately.
4. Keep answers concise, accurate, and easy to understand.
5. Be empathetic and supportive.
6. When unsure, say so honestly rather than guessing.
"""


def get_ai_response(messages_history: list[dict]) -> str:
    """
    Generate an AI response given the conversation history.
    
    Args:
        messages_history: List of dicts with 'role' and 'content' keys.
    
    Returns:
        The assistant's reply as a string.
    """
    api_key = getattr(settings, 'OPENAI_API_KEY', None)

    if api_key:
        return _openai_response(api_key, messages_history)
    else:
        return _fallback_response(messages_history)


def _openai_response(api_key: str, messages_history: list[dict]) -> str:
    """Call the OpenAI Chat Completions API."""
    try:
        import openai

        client = openai.OpenAI(api_key=api_key)

        api_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        # Include up to last 20 messages for context
        for msg in messages_history[-20:]:
            api_messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

        response = client.chat.completions.create(
            model=getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini'),
            messages=api_messages,
            max_tokens=1024,
            temperature=0.7,
        )

        return response.choices[0].message.content.strip()

    except ImportError:
        logger.error("openai package is not installed. Run: pip install openai")
        return _fallback_response(messages_history)
    except Exception as e:
        error_str = str(e).lower()
        logger.error(f"OpenAI API error: {e}")

        # Give the user a helpful hint depending on the error type
        if "authentication" in error_str or "invalid api key" in error_str or "401" in error_str:
            return (
                "⚠️ The AI service could not authenticate. "
                "The API key may be invalid or expired. "
                "I'll still try to help with my built-in knowledge.\n\n"
            ) + _fallback_response(messages_history)

        if "quota" in error_str or "rate" in error_str or "429" in error_str:
            return (
                "⚠️ The AI service is temporarily rate-limited or out of quota. "
                "I'll answer with my built-in knowledge for now.\n\n"
            ) + _fallback_response(messages_history)

        if "model" in error_str and ("not found" in error_str or "does not exist" in error_str):
            # Retry with a known-good model
            try:
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=api_messages,
                    max_tokens=1024,
                    temperature=0.7,
                )
                return response.choices[0].message.content.strip()
            except Exception:
                pass

        return _fallback_response(messages_history)


def _fallback_response(messages_history: list[dict]) -> str:
    """Rule-based fallback when no API key is configured."""
    if not messages_history:
        return "Hello! I'm SalusLogica AI, your health assistant. How can I help you today?"

    last_message = messages_history[-1]["content"].lower()

    # Greetings
    greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]
    if any(g in last_message for g in greetings):
        return (
            "Hello! 👋 I'm SalusLogica AI, your health assistant. "
            "I can help you with medication questions, drug interactions, "
            "side effects, and general health tips. What would you like to know?"
        )

    # Emergency
    emergency_words = ["emergency", "heart attack", "stroke", "can't breathe", "unconscious", "severe bleeding", "chest pain"]
    if any(w in last_message for w in emergency_words):
        return (
            "🚨 This sounds like it could be a medical emergency. "
            "Please call emergency services (112/911) immediately. "
            "Do not delay seeking professional medical help."
        )

    # Medication questions
    med_words = ["medicine", "medication", "drug", "pill", "tablet", "capsule", "dose", "dosage"]
    if any(w in last_message for w in med_words):
        return (
            "I can help with medication questions! Here are some things I can assist with:\n\n"
            "• **Side effects** — Ask about common side effects of your medicines\n"
            "• **Drug interactions** — Check if your medicines interact with each other\n"
            "• **Dosage info** — Understand your prescribed dosage\n"
            "• **Food interactions** — Learn what to eat or avoid with your medication\n\n"
            "What would you like to know? You can also use the Interaction Checker "
            "or Safety Check pages for detailed analysis.\n\n"
            "⚠️ *Always follow your doctor's advice for dosage changes.*"
        )

    # Side effects
    if "side effect" in last_message or "adverse" in last_message:
        return (
            "Side effects vary by medication. You can:\n\n"
            "1. Check the **Side Effect Tracker** page to log and monitor your symptoms\n"
            "2. Use the **Safety Check** to review known side effects of your medicines\n"
            "3. Ask me about a specific medication's common side effects\n\n"
            "If you're experiencing severe side effects, please contact your doctor or pharmacist immediately."
        )

    # Interaction
    if "interaction" in last_message:
        return (
            "Drug interactions are important to be aware of! You can:\n\n"
            "1. Use the **Interaction Checker** page to check your current medicines\n"
            "2. Ask me about specific drug combinations\n\n"
            "Always inform your doctor about all medications you're taking, "
            "including over-the-counter drugs and supplements."
        )

    # Reminder / Alarm
    if "reminder" in last_message or "alarm" in last_message or "schedule" in last_message:
        return (
            "SalusLogica has a built-in alarm system to help you stay on track! You can:\n\n"
            "1. Set up medication reminders from the **Add Medicine** page\n"
            "2. View and manage alarms from your **Dashboard**\n"
            "3. Check your **Dose History** to track your adherence\n\n"
            "Consistent medication timing helps improve effectiveness."
        )

    # Thanks
    if "thank" in last_message or "thanks" in last_message:
        return "You're welcome! 😊 Feel free to ask me anything else about your health or medications."

    # Default
    return (
        "I'm here to help with health and medication questions! You can ask me about:\n\n"
        "• Medication side effects and interactions\n"
        "• How to take your medicines properly\n"
        "• General health and wellness tips\n"
        "• How to use SalusLogica features\n\n"
        "What would you like to know?\n\n"
        "*Note: For personalized medical advice, please consult your healthcare provider.*"
    )
