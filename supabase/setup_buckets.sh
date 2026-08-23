#!/bin/bash
# supabase/setup_buckets.sh
# Creates and configures private storage buckets for WACT.
# Run AFTER: supabase link --project-ref YOUR_PROJECT_REF
#
# Usage:
#   chmod +x supabase/setup_buckets.sh
#   ./supabase/setup_buckets.sh
#
# Or use the Supabase Dashboard → Storage → Create Bucket manually.

set -e

echo "Creating WACT storage buckets..."

# case-evidences (private, 10MB limit)
supabase storage create-bucket case-evidences \
  --public=false \
  --file-size-limit=10485760 \
  --allowed-mime-types="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,application/pdf"

# inspection-evidences (private, 10MB limit)
supabase storage create-bucket inspection-evidences \
  --public=false \
  --file-size-limit=10485760 \
  --allowed-mime-types="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,application/pdf"

# asset-photos (private, 5MB limit)
supabase storage create-bucket asset-photos \
  --public=false \
  --file-size-limit=5242880 \
  --allowed-mime-types="image/jpeg,image/png,image/webp,image/heic"

# avatars (private, 2MB limit)
supabase storage create-bucket avatars \
  --public=false \
  --file-size-limit=2097152 \
  --allowed-mime-types="image/jpeg,image/png,image/webp"

echo "Buckets created:"
supabase storage list-buckets

echo ""
echo "IMPORTANT: All buckets are PRIVATE."
echo "Use signed URLs to serve files (1-hour expiry recommended)."
echo ""
echo "Next: apply 020_storage_buckets.sql in your Supabase SQL editor to install RLS policies."
