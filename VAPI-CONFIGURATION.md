# VAPI Assistant Configuration Guide

## Overview

This document explains how to configure your VAPI assistant to work with the bankruptcy intake webhook for incremental data collection and persistence.

## Assistant Identity

**Name:** Elliot
**Role:** Bankruptcy intake specialist

Configure the assistant's name in the VAPI dashboard:
1. Go to your assistant settings
2. Set the assistant's name to "Elliot"
3. Ensure the first message introduces Elliot by name

## Critical Design: Incremental Updates

The system is designed to save data **incrementally** to prevent data loss if calls drop prematurely:

1. **Case is created immediately** when client provides their name
2. **Each piece of information is saved as it's collected** (not at the end of the call)
3. **No data loss** if call drops - whatever was collected is already in the database

## Function Call Flow

### 1. Start of Call: Check/Create Case

**Function:** `check_existing_case`

**When to call:** Immediately after collecting client's first and last name

**Parameters:**
```json
{
  "first_name": "John",
  "last_name": "Doe"
}
```

**What it does:**
- Searches for existing cases by name
- **If no case exists:** Automatically creates a new case with the name
- **If case exists:** Returns existing case ID for identity verification

**Returns:**
```json
{
  "hasExistingCase": false,
  "caseId": "case_1234567890_abc123",
  "message": "I've started a new case for John Doe. Let's gather your information."
}
```

**IMPORTANT:** Store the `caseId` in a variable to use in subsequent function calls.

### 2. During Call: Save Each Field

**Function:** `update_case_intake`

**When to call:** After collecting **each piece** of information (not at the end!)

**Examples:**

After collecting email:
```json
{
  "case_id": "case_1234567890_abc123",
  "client_email": "john.doe@example.com"
}
```

After collecting phone:
```json
{
  "case_id": "case_1234567890_abc123",
  "client_phone": "555-123-4567"
}
```

After collecting address:
```json
{
  "case_id": "case_1234567890_abc123",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zip": "94102",
  "county": "San Francisco"
}
```

After collecting SSN last 4:
```json
{
  "case_id": "case_1234567890_abc123",
  "ssn_last_4": "1234"
}
```

After collecting household size:
```json
{
  "case_id": "case_1234567890_abc123",
  "household_size": 3
}
```

**Key points:**
- You can pass multiple fields at once or one at a time
- Only fields you provide will be updated
- Existing data is never overwritten with null/empty values
- Call this function **multiple times** throughout the conversation

## Recommended Conversation Flow

```
VAPI: "Hi, I'm Elliot, your bankruptcy intake specialist. What's your name?"
Client: "John Doe"

→ Call check_existing_case(first_name="John", last_name="Doe")
← Returns: caseId = "case_1234567890_abc123"

VAPI: "Great, John. What's the best email address to reach you?"
Client: "john@example.com"

→ Call update_case_intake(case_id="case_1234567890_abc123", client_email="john@example.com")
← Returns: success

VAPI: "Perfect. What's your phone number?"
Client: "555-123-4567"

→ Call update_case_intake(case_id="case_1234567890_abc123", client_phone="555-123-4567")
← Returns: success

... continue for each field ...
```

## All Supported Fields

You can update any of these fields via `update_case_intake`:

| Field | Type | Description |
|-------|------|-------------|
| `client_email` | string | Email address |
| `client_phone` | string | Phone number |
| `ssn_last_4` | string | Last 4 digits of SSN (exactly 4 digits) |
| `address` | string | Street address |
| `city` | string | City |
| `state` | string | State (2-letter code) |
| `zip` | string | ZIP code |
| `county` | string | County name |
| `household_size` | number | Number of people in household |
| `case_type` | string | "chapter7" or "chapter13" |
| `filing_type` | string | "individual" or "joint" |

## VAPI Assistant System Prompt Template

```
You are Elliot, a bankruptcy intake specialist conducting a phone interview.

Your goal is to collect the client's information for their bankruptcy case.

CRITICAL INSTRUCTIONS:
1. Introduce yourself as Elliot when the call starts
2. Ask for their full name (first and last)
3. IMMEDIATELY call check_existing_case with their name
4. Store the returned caseId in memory
5. After collecting EACH piece of information, call update_case_intake with:
   - The caseId
   - The field(s) you just collected
6. DO NOT wait until the end of the call to save data

Information to collect:
- Full name (required - collected first)
- Email address
- Phone number
- Last 4 digits of SSN
- Full address (street, city, state, ZIP, county)
- Filing type (individual or joint)
- Household size

Be conversational, patient, and professional. Confirm information back to the client.

If the call drops, don't worry - all collected information is already saved.
```

## Function Definitions for VAPI Dashboard

### check_existing_case

```json
{
  "name": "check_existing_case",
  "description": "Check if a client has an existing bankruptcy case by name. Automatically creates a new case if none exists. Call this FIRST after getting the client's name.",
  "parameters": {
    "type": "object",
    "properties": {
      "first_name": {
        "type": "string",
        "description": "Client's first name"
      },
      "last_name": {
        "type": "string",
        "description": "Client's last name"
      }
    },
    "required": ["first_name", "last_name"]
  }
}
```

### update_case_intake

```json
{
  "name": "update_case_intake",
  "description": "Update an existing case with collected information. Call this AFTER EACH field is collected (not at the end of call). Only include fields you've just collected.",
  "parameters": {
    "type": "object",
    "properties": {
      "case_id": {
        "type": "string",
        "description": "Case ID returned from check_existing_case"
      },
      "client_email": {
        "type": "string",
        "description": "Client's email address"
      },
      "client_phone": {
        "type": "string",
        "description": "Client's phone number"
      },
      "ssn_last_4": {
        "type": "string",
        "description": "Last 4 digits of SSN (exactly 4 digits)"
      },
      "address": {
        "type": "string",
        "description": "Street address"
      },
      "city": {
        "type": "string",
        "description": "City"
      },
      "state": {
        "type": "string",
        "description": "State (2-letter code like CA, NY, TX)"
      },
      "zip": {
        "type": "string",
        "description": "ZIP code"
      },
      "county": {
        "type": "string",
        "description": "County name"
      },
      "household_size": {
        "type": "number",
        "description": "Number of people in household"
      },
      "case_type": {
        "type": "string",
        "description": "chapter7 or chapter13"
      },
      "filing_type": {
        "type": "string",
        "description": "individual or joint"
      }
    },
    "required": ["case_id"]
  }
}
```

## Testing the Configuration

1. **Test premature hangup:** Start a call, provide just a name and email, then hang up
   - Check dashboard - case should exist with name and email saved

2. **Test incremental updates:** Start a call, provide information slowly
   - After each field, check the database to verify it was saved

3. **Test existing case:** Call back with the same name
   - Should find existing case instead of creating duplicate

## Webhook URL

Configure your VAPI assistant's "Server URL" to:
```
https://your-domain.com/api/vapi/webhook
```

The webhook handles:
- Function call routing
- Database connections (via metadata)
- Error handling
- Data validation

## Security Note

The webhook expects the database connection string to be passed in the call metadata. This is automatically handled for:
- **Inbound calls:** via browser-initiated Web SDK call (from /cases page)
- **Outbound calls:** via outbound API endpoint (from case detail page)

See [SECURITY.md](SECURITY.md) for more details on the multi-tenant architecture.
