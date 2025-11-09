-- Simplify Product Library RLS
-- Products are globally shared - all authenticated users can read
-- No organization scoping needed

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view products for their organization's master clauses" ON product_library;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON product_library;

-- Simple global read access for all authenticated users
CREATE POLICY "Authenticated users can view all products"
    ON product_library
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can insert/update/delete products
CREATE POLICY "Authenticated users can manage products"
    ON product_library
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
