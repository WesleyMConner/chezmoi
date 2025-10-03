# Abstract
#    This script is used to strip significant content from Antora-produced
#    HTML pages BEFORE using HtmlDoc to convert the same HTML files to a PDF.
#
#    In the Perl substitutions below
#      /sg s=multiline  g=looping (not strictly required here)
#
# Design Notes
#    DO NOT waste time with sed on MacOS. It is F'D UP.
#
cd /Users/wes/Sync/opigence/dochub-2023-03-21/dochub
find . -type f -name "*.html" -exec perl -i -0777 -pe '
  s#<nav class="navbar">.*?</nav>##sg;                    # Top Blue Nav
  s#<div class="edit-this-page">.*?</div>##sg;            # Nested Div
  s#<aside class="nav">.*?</aside>##sg;                   # Left-side Nav
  s#<div class="toolbar" role="navigation">.*?</div>##sg; # Doc Hub/../..
  s#<nav class="pagination">.*?</nav>##sg;                # Prev & Next
  s#<footer class="footer">.*?</script>##sg;              # Page Bottom
' {} +
