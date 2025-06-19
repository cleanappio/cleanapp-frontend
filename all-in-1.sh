# Create a combined file with all code files
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.css" -o -name "*.md" | \
grep -v node_modules | \
while read file; do
    echo "// File: $file" >> combined-project.txt
    echo "" >> combined-project.txt
    cat "$file" >> combined-project.txt
    echo "" >> combined-project.txt
    echo "// ----------------" >> combined-project.txt
    echo "" >> combined-project.txt
done
