import { jsPDF } from 'jspdf';

// Helper to convert image URL to Base64
const getBase64FromUrl = async (url) => {
  try {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result);
    });
  } catch (error) {
    console.error('Error loading image:', url, error);
    return null; // Return null if image fails to load
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const generateFamilyBook = async (familyMembers, treeImageBase64, user, serverUrl) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // --- PAGE 1: COVER ---
  doc.setFillColor(240, 248, 255); // AliceBlue background
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setFont('times', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(50, 50, 50);
  
  const title = `The ${user?.last_name || 'Family'} Family`;
  const subtitle = "History Book";
  
  doc.text(title, pageWidth / 2, pageHeight / 3, { align: 'center' });
  doc.setFontSize(24);
  doc.text(subtitle, pageWidth / 2, pageHeight / 3 + 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('times', 'normal');
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
  
  // --- PAGE 2: THE TREE ---
  if (treeImageBase64) {
    doc.addPage();
    doc.setFontSize(20);
    doc.setFont('times', 'bold');
    doc.text("Family Tree Chart", pageWidth / 2, 20, { align: 'center' });
    
    // Fit image to page while maintaining aspect ratio
    const imgProps = doc.getImageProperties(treeImageBase64);
    const pdfWidth = pageWidth - (margin * 2);
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    doc.addImage(treeImageBase64, 'PNG', margin, 30, pdfWidth, pdfHeight);
  }

  // --- MEMBER PAGES ---
  // Sort members (e.g., oldest first, or by ID)
  const sortedMembers = [...familyMembers].sort((a, b) => a.id - b.id);

  for (const member of sortedMembers) {
    doc.addPage();
    
    // Background accent
    doc.setFillColor(250, 250, 250);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header Line
    doc.setDrawColor(76, 175, 80); // Green
    doc.setLineWidth(1);
    doc.line(margin, 25, pageWidth - margin, 25);

    // Name
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text(`${member.first_name} ${member.last_name || ''}`, margin, 20);

    let yPos = 40;

    // Profile Image
    if (member.profile_img_url) {
      const imageUrl = `${serverUrl}${member.profile_img_url}`;
      const base64Img = await getBase64FromUrl(imageUrl);
      if (base64Img) {
        // Circular mask simulation (white corners) is hard in PDF, just do square for now
        // or rounded rect clip if possible, but basic addImage is safer.
        doc.addImage(base64Img, 'JPEG', margin, yPos, 60, 60);
        // Add a border
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPos, 60, 60);
      } else {
        // Placeholder box
        doc.rect(margin, yPos, 60, 60);
        doc.setFontSize(10);
        doc.text("No Photo", margin + 15, yPos + 30);
      }
    } else {
        // Placeholder box if no URL
        doc.setDrawColor(200);
        doc.rect(margin, yPos, 60, 60);
        doc.setFontSize(10);
        doc.text("No Photo", margin + 15, yPos + 30);
    }

    // Vital Stats (Right of Image)
    const textX = margin + 70;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    
    doc.text("Born:", textX, yPos + 10);
    doc.setFont('times', 'normal');
    doc.text(formatDate(member.birth_date), textX + 30, yPos + 10);

    if (member.anniversary_date) {
      doc.setFont('times', 'bold');
      doc.text("Anniversary:", textX, yPos + 20);
      doc.setFont('times', 'normal');
      doc.text(formatDate(member.anniversary_date), textX + 30, yPos + 20);
    }
    
    if (member.nickname) {
        doc.setFont('times', 'bold');
        doc.text("Nickname:", textX, yPos + 30);
        doc.setFont('times', 'normal');
        doc.text(member.nickname, textX + 30, yPos + 30);
    }

    if (member.gender) {
        doc.setFont('times', 'bold');
        doc.text("Gender:", textX, yPos + 40);
        doc.setFont('times', 'normal');
        doc.text(member.gender, textX + 30, yPos + 40);
    }

    yPos += 70; // Move below image

    // Biography / Description
    if (member.description) {
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text("Biography", margin, yPos);
      yPos += 10;
      
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      
      const splitText = doc.splitTextToSize(member.description, pageWidth - (margin * 2));
      doc.text(splitText, margin, yPos);
      
      yPos += (splitText.length * 7) + 10;
    } else {
        yPos += 10;
    }

    // Family Relations
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text("Family Connections", margin, yPos);
    yPos += 10;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    // Parents
    if (member.father_id || member.mother_id) {
        const father = familyMembers.find(m => m.id === member.father_id);
        const mother = familyMembers.find(m => m.id === member.mother_id);
        
        let parentText = "Parents: ";
        if (father) parentText += `${father.first_name} ${father.last_name || ''}`;
        if (father && mother) parentText += " & ";
        if (mother) parentText += `${mother.first_name} ${mother.last_name || ''}`;
        
        doc.text(parentText, margin, yPos);
        yPos += 7;
    }

    // Spouse
    if (member.spouse_id) {
        const spouse = familyMembers.find(m => m.id === member.spouse_id);
        if (spouse) {
            doc.text(`Spouse: ${spouse.first_name} ${spouse.last_name || ''}`, margin, yPos);
            yPos += 7;
        }
    }

    // Children
    const children = familyMembers.filter(m => m.father_id === member.id || m.mother_id === member.id);
    if (children.length > 0) {
        const childNames = children.map(c => c.first_name).join(', ');
        // Text wrapping for children list
        const childLabel = "Children: ";
        const childText = doc.splitTextToSize(childLabel + childNames, pageWidth - (margin * 2));
        doc.text(childText, margin, yPos);
    }
  }

  doc.save(`${user?.last_name || 'Family'}_History_Book.pdf`);
};
