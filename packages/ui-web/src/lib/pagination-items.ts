/** v0's page list: numbers, with `NaN` where an ellipsis goes. */
export function getPaginationItems(
  page: number,
  lastPage: number,
  maxLength: number
): number[] {
  const res: number[] = []
  if (lastPage <= maxLength) {
    for (let i = 1; i <= lastPage; i++) res.push(i)
    return res
  }
  const firstPage = 1
  const confirmedPagesCount = 3
  const deductedMaxLength = maxLength - confirmedPagesCount
  const sideLength = deductedMaxLength / 2

  if (page - firstPage < sideLength || lastPage - page < sideLength) {
    for (let j = 1; j <= sideLength + firstPage; j++) res.push(j)
    res.push(Number.NaN)
    for (let k = lastPage - sideLength; k <= lastPage; k++) res.push(k)
  } else if (
    page - firstPage >= deductedMaxLength &&
    lastPage - page >= deductedMaxLength
  ) {
    const deductedSideLength = sideLength - 1
    res.push(1)
    res.push(Number.NaN)
    for (let l = page - deductedSideLength; l <= page + deductedSideLength; l++)
      res.push(l)
    res.push(Number.NaN)
    res.push(lastPage)
  } else {
    const isNearFirstPage = page - firstPage < lastPage - page
    let remainingLength = maxLength
    if (isNearFirstPage) {
      for (let m = 1; m <= page + 1; m++) {
        res.push(m)
        remainingLength -= 1
      }
      res.push(Number.NaN)
      remainingLength -= 1
      for (let n = lastPage - (remainingLength - 1); n <= lastPage; n++)
        res.push(n)
    } else {
      for (let o = lastPage; o >= page - 1; o--) {
        res.unshift(o)
        remainingLength -= 1
      }
      res.unshift(Number.NaN)
      remainingLength -= 1
      for (let p = remainingLength; p >= 1; p--) res.unshift(p)
    }
  }
  return res
}
