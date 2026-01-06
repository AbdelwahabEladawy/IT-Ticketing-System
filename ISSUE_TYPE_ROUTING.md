# Issue Type Routing Feature - Implementation Documentation

## Overview
This document describes the **additive** Issue Type Selection feature that routes tickets to specific IT teams without modifying existing routing logic.

## Architecture

### 1. Configuration Layer (`server/config/issueTypeMapping.js`)
- **Purpose**: Centralized mapping of issue types to specializations
- **Structure**: 
  - `ISSUE_TYPE_MAPPING`: Maps issue type strings to specialization names
  - `ISSUE_TYPES_BY_TEAM`: Groups issue types by team for UI display
- **Extensibility**: Add new mappings here without touching routing logic

### 2. Routing Utility (`server/utils/issueRouting.js`)
- **Purpose**: Isolated routing logic for issue type selection
- **Behavior**:
  - If `issueType` provided → Routes to mapped specialization
  - If `issueType` is null or "CUSTOM" → Returns null (existing logic handles it)
- **Key Point**: This function does NOT modify existing routing. It only adds new routing path.

### 3. Database Schema
- **New Field**: `issueType` (String?, nullable) in Ticket model
- **Migration**: Applied via `server/scripts/add-issue-type-column.js`
- **Backward Compatibility**: Field is optional, existing tickets remain valid

### 4. API Routes
- **New Endpoint**: `GET /api/issue-types` - Returns available issue types
- **Updated Endpoint**: `POST /api/tickets` - Accepts optional `issueType` parameter

## Routing Priority

The routing decision follows this priority:

1. **Issue Type Selected** → Route directly to mapped specialization
   - Uses `routeByIssueType()` utility
   - Assigns via existing round-robin logic
   - Skips text-based routing

2. **No Issue Type / Custom Problem** → Use existing routing logic
   - PREDEFINED + specializationId → Auto-assign (existing)
   - CUSTOM → Unassigned for IT Admin (existing)

## Team to Specialization Mapping

The system maps teams to specializations by name:
- **IT_HELP_DESK** → `Help Desk` specialization
- **IT_ADMIN** → `IT Admin` specialization  
- **NETWORK_ENGINEER** → `Network` specialization

**Note**: These specializations must exist in the database. Run `server/scripts/ensure-required-specializations.js` to create them.

## Files Modified

### Backend
- `server/config/issueTypeMapping.js` - **NEW**: Configuration mapping
- `server/utils/issueRouting.js` - **NEW**: Routing utility
- `server/routes/issueTypes.js` - **NEW**: API endpoint for issue types
- `server/routes/tickets.js` - **MODIFIED**: Added issueType handling (additive only)
- `server/prisma/schema.prisma` - **MODIFIED**: Added issueType field
- `server/index.js` - **MODIFIED**: Added issueTypes route

### Frontend
- `client/pages/tickets/create.tsx` - **MODIFIED**: Added issue type selection UI
- `client/pages/tickets/[id].tsx` - **MODIFIED**: Display issueType if present

## Backward Compatibility

✅ **All existing functionality preserved**:
- Custom problem text input still works
- Existing routing logic unchanged
- Specialization-based routing unchanged
- Round-robin assignment unchanged
- All existing tickets remain valid

## Testing Checklist

1. ✅ Create ticket with issue type → Routes to correct team
2. ✅ Create ticket without issue type → Uses existing logic
3. ✅ Create ticket with "CUSTOM" issue type → Uses existing logic
4. ✅ Existing tickets display correctly
5. ✅ IT Admin can still manually assign CUSTOM tickets

## Future Extensibility

To add new issue types:
1. Add mapping to `ISSUE_TYPE_MAPPING` in `server/config/issueTypeMapping.js`
2. Add to appropriate team in `ISSUE_TYPES_BY_TEAM`
3. Ensure target specialization exists
4. No code changes needed in routing logic

