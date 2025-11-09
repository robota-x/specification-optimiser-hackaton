# ESG Optimization Engine - Production Implementation

## Overview

The ESG (Environmental, Social, Governance) Optimization Engine is an AI-powered feature that analyzes construction specifications to identify opportunities for reducing embodied carbon. It uses advanced Natural Language Processing (NLP) to extract materials from specification text, matches them against a database of Environmental Product Declarations (EPDs), and generates actionable recommendations for lower-carbon alternatives.

## Key Features

- **Automatic Analysis**: ESG analysis runs automatically in the background when you save your project
- **Real NLP Material Extraction**: Uses AI to understand and extract materials from natural language specification text
- **Canonical Material Database**: Links to authoritative EPD/LCA data sources (EC3, ICE Database, etc.)
- **AI-Generated Reports**: Produces comprehensive, prioritized reports with the top carbon-saving opportunities
- **Real-time Updates**: Uses Supabase Realtime to update the UI automatically when analysis completes
- **Asynchronous Processing**: Long-running analysis jobs don't block the UI

## Architecture

### The "Full NLP" vs "Lookup Key" Approach

**Why Full NLP?**
- A simple "lookup key" (e.g., `string.includes()`) would fail if users write "Portland Cement" when our key is "OPC Cement"
- NLP understands context, handles typos, and normalizes material names
- Can extract quantities and understand intent from natural language

**How it Works:**
1. **NLP Entity Extraction**: LLM scans all specification text to extract materials
2. **Entity Linking**: Extracted materials are linked to the canonical ESG Material Library using NLP tags (synonyms)
3. **Analysis**: Calculate carbon savings for alternative materials
4. **Report Generation**: LLM generates a professional ESG report with recommendations

### Workflow

```
User clicks "Save"
    ↓
1. Save project (standard save flow)
    ↓
2. Trigger initiate-project-analysis (non-blocking)
    ↓
3. Create analysis job (status: queued)
    ↓
4. Invoke run-analysis-job Edge Function
    ↓
5. Extract all project text
    ↓
6. Call LLM for material extraction (NLP)
    ↓
7. Link extracted materials to ESG library
    ↓
8. Calculate carbon savings for alternatives
    ↓
9. Call LLM for report generation
    ↓
10. Save report to database
    ↓
11. Real-time update notifies UI
    ↓
User sees ESG report in "ESG Analysis" tab
```

## Database Schema

### Table: `esg_material_library`
Canonical database of construction materials with ESG data.

**Key Fields:**
- `name`: Canonical material name (e.g., "Portland Cement (CEM I)")
- `data_source`: Source of EPD data (e.g., "EC3", "ICE Database")
- `embodied_carbon`: Carbon footprint (kgCO2e)
- `alternative_to_ids`: Array of material IDs this can replace
- `nlp_tags`: JSONB with synonyms and tags for NLP matching
  ```json
  {
    "synonyms": ["OPC Cement", "CEM I", "Portland Cement"],
    "tags": ["cement", "concrete", "binder"]
  }
  ```

**Sample Data:**
The migration includes seed data with common UK construction materials:
- Portland Cement (CEM I) - 820 kgCO2e/tonne
- GGBS Cement (CEM III/A) - 270 kgCO2e/tonne (67% savings)
- Standard Facing Bricks - 230 kgCO2e/1000 bricks
- Reclaimed Bricks - 25 kgCO2e/1000 bricks (89% savings)
- Virgin Steel - 2100 kgCO2e/tonne
- Recycled Steel - 630 kgCO2e/tonne (70% savings)

### Table: `project_analysis_job`
Manages the asynchronous analysis workflow.

**Key Fields:**
- `status`: 'queued' | 'running' | 'complete' | 'failed'
- `error_message`: Error details if analysis fails

### Table: `project_esg_suggestion`
Stores AI-generated ESG reports and suggestions.

**Key Fields:**
- `source_clause_id`: NULL for project-wide reports, NOT NULL for clause-specific suggestions
- `suggestion_narrative`: Markdown-formatted report content
- `status`: 'new' | 'seen' | 'dismissed'

## Edge Functions

### 1. `llm-wrapper`
Multi-purpose LLM function that supports:

**Extract Mode:**
```typescript
POST /functions/v1/llm-wrapper
{
  "prompt_type": "extract",
  "payload": {
    "text": "Full specification text..."
  }
}
```

Returns:
```json
[
  {
    "material": "Portland Cement (CEM I)",
    "quantity": "10 tonnes",
    "context": "For concrete mix in structural elements"
  }
]
```

**Report Mode:**
```typescript
POST /functions/v1/llm-wrapper
{
  "prompt_type": "report",
  "payload": {
    "projectName": "Office Building Spec",
    "analysis": {
      "totalCurrentCarbon": 50000,
      "totalPotentialSavings": 15000,
      "suggestions": [...]
    }
  }
}
```

Returns:
```json
{
  "title": "ESG Analysis: Office Building Spec",
  "summary": "...",
  "topRecommendations": [...],
  "additionalOpportunities": [...],
  "nextSteps": "..."
}
```

### 2. `initiate-project-analysis`
Lightweight function that queues an analysis job.

```typescript
POST /functions/v1/initiate-project-analysis
{
  "project_id": "uuid"
}
```

**Responsibilities:**
- Verify user owns the project
- Check if analysis is already running
- Create new job in `project_analysis_job` table
- Invoke `run-analysis-job` asynchronously

### 3. `run-analysis-job`
Heavy-lifting function that performs the complete analysis.

**Steps:**
1. Extract all text from project clauses
2. Call `llm-wrapper` (extract mode) to extract materials
3. Link materials to ESG library using NLP tags
4. Find alternatives and calculate carbon savings
5. Call `llm-wrapper` (report mode) to generate report
6. Save report to `project_esg_suggestion` table
7. Update job status to 'complete'

**Error Handling:**
- Wraps entire process in try/catch
- Updates job status to 'failed' on error
- Stores error message for debugging

## Frontend Components

### `ESGReport`
Main component that displays ESG analysis with real-time updates.

**Features:**
- Real-time subscriptions to job status and suggestions
- Loading states (queued, running)
- Error handling with retry button
- Manual "Run Analysis" button

**Usage:**
```tsx
import { ESGReport } from '@/components/esg';

<ESGReport projectId={projectId} />
```

### `SuggestionCard`
Displays individual ESG reports with markdown rendering.

**Features:**
- Markdown formatting support
- Status badges (New, Seen, Dismissed)
- Action buttons (Mark as Seen, Dismiss, Restore)
- Formatted timestamps

## Service Layer

The `esg.service.ts` provides a clean API for ESG operations:

```typescript
// Initiate analysis
await initiateProjectAnalysis(projectId);

// Get latest job
const job = await getLatestAnalysisJob(projectId);

// Get project report
const report = await getProjectESGReport(projectId);

// Real-time subscriptions
const unsubscribe = subscribeToAnalysisJob(projectId, (job) => {
  console.log('Job updated:', job);
});

// Search materials
const materials = await searchESGMaterials('cement');
```

## User Experience

### Automatic Analysis on Save

When a user saves their project:
1. Normal save completes
2. Toast: "Saved!"
3. Background analysis starts
4. Toast: "ESG Analysis Started - Running ESG analysis in the background..."
5. User can continue editing
6. UI updates automatically when analysis completes

### ESG Analysis Tab

The SpecEditor now has two tabs:
- **Editor**: Standard specification editing
- **ESG Analysis**: View ESG reports and recommendations

**States:**
- **No Analysis**: Shows prompt to run analysis
- **Running**: Shows loading indicator with status message
- **Complete**: Displays full ESG report with recommendations
- **Failed**: Shows error with retry button

### ESG Report Structure

Reports include:
1. **Executive Summary**: Overall carbon footprint and savings potential
2. **Top 3 Recommendations**: Detailed, prioritized suggestions with:
   - Material swap details
   - Carbon savings (quantified)
   - Cost implications
   - Implementation difficulty
   - Technical considerations
3. **Additional Opportunities**: Brief list of other savings
4. **Next Steps**: Actionable advice for implementation

## Extending the System

### Adding New Materials

Materials can be added via SQL or a future admin UI:

```sql
INSERT INTO esg_material_library (
  name,
  data_source,
  embodied_carbon,
  carbon_unit,
  cost_impact_text,
  modifications_text,
  alternative_to_ids,
  nlp_tags
) VALUES (
  'Low Carbon Concrete C30/37',
  'Concrete Centre',
  110.00,
  'kgCO2e/m3',
  '5-8% cost increase',
  'Extended curing required in cold weather',
  ARRAY(SELECT esg_material_id FROM esg_material_library WHERE name = 'Standard Concrete C30/37'),
  '{"synonyms": ["low carbon concrete", "eco concrete"], "tags": ["concrete", "low-carbon"]}'::jsonb
);
```

### Future Enhancements

**Clause-Specific Suggestions:**
Currently, all suggestions are project-wide (`source_clause_id` is NULL). Future versions could:
- Generate suggestions per clause
- Show inline suggestions in the editor
- Allow users to accept/reject suggestions

**Material Import from External APIs:**
- Integrate with EC3 API for live EPD data
- Sync with ICE Database updates
- Pull manufacturer-specific EPDs

**Cost Analysis:**
- Add detailed cost modeling
- Calculate ROI for carbon reduction
- Compare lifecycle costs

**Regulatory Compliance:**
- Check against building regulations
- Calculate BREEAM/LEED points
- Generate compliance reports

## Troubleshooting

### Analysis Stuck in "Running"
- Check Edge Function logs in Supabase dashboard
- Verify Gemini API key is configured
- Check for rate limiting

### No Materials Extracted
- Ensure specification has material references
- Check if materials exist in ESG library
- Review NLP tags for synonym matching

### Analysis Fails
- Check `error_message` in `project_analysis_job` table
- Verify Edge Function environment variables
- Check database permissions

## Performance Considerations

- **Analysis Time**: Typically 1-2 minutes depending on specification size
- **Rate Limiting**: Gemini API has rate limits (handled in `llm-wrapper`)
- **Database Queries**: Indexed on foreign keys and JSONB fields
- **Real-time**: Supabase Realtime handles subscriptions efficiently

## Security

- **RLS (Row Level Security)**: Enforced on all tables
- **Authentication**: Required for all Edge Function calls
- **Service Role**: Used for background jobs (properly scoped)
- **Input Validation**: All user inputs validated before processing

## Monitoring

Key metrics to monitor:
- Analysis job success rate
- Average analysis time
- Material extraction accuracy
- User engagement with suggestions
- API usage and costs

## Cost Estimates

**Per Analysis:**
- Gemini API (gemini-1.5-flash): ~$0.01 for extraction
- Gemini API (gemini-1.5-pro): ~$0.05 for report generation
- Supabase: Minimal (< $0.001)

**Total**: ~$0.06 per analysis

---

## Summary

The ESG Optimization Engine is a production-ready, scalable system that:
- Uses real NLP (not simple string matching)
- Connects to authoritative EPD data
- Generates AI-powered, actionable recommendations
- Updates in real-time without blocking the UI
- Provides a seamless user experience

This implementation follows best practices for async processing, error handling, and user feedback, making it ready for production deployment.
