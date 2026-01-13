sed -i '' '331i\
      {!showFullMap && (
' app/page.tsx && sed -i '' '347a\
      )}
' app/page.tsx
